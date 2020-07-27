const uid = require('uid');

const reducer = require('./whatsapp_group/reducer.js')

class WhatsAppGroup {
  constructor() {
    // by default, it's a in-memory db 
    // (basically storing things in an JS object)
    this.es = require('eventstore')();
  }

  async loadAggregateStream(groupId){
    return new Promise((resolve, reject) => {
      this.es.getEventStream("group_" + groupId, function(err, stream){
        if(err){ return reject(err); }
        resolve(stream)
      });
    })
  }

  async getAggregateState(groupId){
    return reducer.reduce(await this.loadAggregateStream(groupId))
  }

  async createGroup(payload){
    const groupId = uid();
    const {groupSubject, userIds, currentUserId} = payload;

    return new Promise(async(resolve, reject) => {
      await this.loadAggregateStream(groupId).then((stream) => {
        if(stream.events.length > 0) {
          return reject("AggregateIdAlreadyUsed");
        }
        
        // init aggregate
        stream.addEvent({ 
          eventName: "GroupWasCreated", 
          groupId: groupId
        });

        // set subject
        stream.addEvent({
          eventName: "SubjectWasChanged",
          groupId: groupId,
          userId: currentUserId,
          groupSubject: groupSubject
        })  

        // add admin
        stream.addEvent({
          eventName: "ParticipantWasAdded",
          groupId: groupId,
          userId: currentUserId,
          admin: true
        })  

        // add invited users
        userIds.forEach((userId) => {
          stream.addEvent({
            eventName: "ParticipantWasAdded",
            groupId: groupId,
            userId: userId,
            admin: false
          })  
        });

        stream.commit(function(err, stream){
          if(err){ reject(err) };
          
          // what here ???
          resolve(groupId);
        });
      }).catch(err => reject(err));
    });
  }

  async addParticipant(payload){
    const {groupId, userId, admin} = payload;

    return new Promise(async(resolve, reject) => {
      await this.loadAggregateStream(groupId).then((stream) => {
        if(stream.events.length == 0) {
          return reject("AggregateIdDoesntExist");
        }

        stream.addEvent({
          eventName: "ParticipantWasAdded",
          groupId: groupId,
          userId: userId,
          admin: admin
        })  

        stream.commit(function(err, stream){
          if(err){ reject(err) };
          resolve(groupId);
        });
      }).catch(err => reject(err));
    });
  }

  async removeParticipant(payload){
    const {groupId, userId} = payload;

    return new Promise(async(resolve, reject) => {
      await this.loadAggregateStream(groupId).then( async (stream) => {
        if(stream.events.length == 0) {
          return reject("AggregateIdDoesntExist");
        }

        const state = await this.getAggregateState(groupId)
        if (!state.hasParticipant(userId)) {
          reject('userId does not belong to the Group');
        }

        stream.addEvent({
          eventName: "ParticipantWasRemoved",
          groupId: groupId,
          userId: userId
        })  

        stream.commit(function(err, stream){
          if(err){ reject(err) };
          resolve(groupId);
        });
      }).catch(err => reject(err));
    });
  }
}

module.exports = WhatsAppGroup 