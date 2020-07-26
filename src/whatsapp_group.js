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
}

module.exports = WhatsAppGroup 