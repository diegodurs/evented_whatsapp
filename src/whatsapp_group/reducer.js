class WhatsAppGroupReducer {

  // Reduce stream into the entity state
  static reduce(stream) {
    let groupId = stream.streamId.replace("group_", "");
    let group = new WhatsAppGroupReducer(groupId);

    group.reduce(stream.events);
    return group;
  }
  
  constructor(groupId) {
    this.groupId = groupId;
    this.participants = [];
  }

  hasParticipant(userId) {
    const ids = this.participants.map((participant) => participant.userId)
    return ids.includes(userId)
  }

  asJson(){
    return {
      groupId: this.groupId,
      groupSubject: this.groupSubject,
      participants: this.participants,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  // -- CQS --

  reduce(events){
    events.forEach((event) => {
      switch(event.payload.eventName) {
        case 'GroupWasCreated':
          this.setCreatedAt(event.commitStamp);
          break;
        case 'SubjectWasChanged':
          this.setUpdatedAt(event.commitStamp);
          this.setGroupSubject(event.payload.groupSubject)
          break;
        case 'ParticipantWasAdded':
          this.setUpdatedAt(event.commitStamp);
          this.addParticipant({
            userId: event.payload.userId,
            admin: event.payload.admin
          })
          break;
        case 'ParticipantWasRemoved':
          this.setUpdatedAt(event.commitStamp);
          this.removeParticipant({
            userId: event.payload.userId
          })
          break;
      }
    })
  }

  setGroupSubject(subject){
    this.groupSubject = subject;
  }

  addParticipant(participant){
    this.participants.push(participant);
  }

  removeParticipant(participant){
    this.participants = this.participants.filter((p) => p.userId !== participant.userId);
  }

  setCreatedAt(timestamp){
    this.createdAt = timestamp
    this.updatedAt = timestamp
  }

  setUpdatedAt(timestamp){
    this.updatedAt = timestamp 
  }
}

module.exports = WhatsAppGroupReducer