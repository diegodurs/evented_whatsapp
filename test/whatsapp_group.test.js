var assert = require('assert');
var uid = require('uid');
var WhatsAppGroup = require('../src/whatsapp_group');

describe('WhatsAppGroup', () => {
  const currentUserId = uid();
  const user1 = uid();
  const user2 = uid();

  const createGroupPayload = {
    currentUserId: currentUserId,
    userIds: [user1, user2],
    groupSubject: "This is an automated test"
  }
  
  before(() => service = new WhatsAppGroup )
  
  describe('#createGroup()', () => {
    it('should return a new id', async () => {

      // When Command

      const response = await service.createGroup(createGroupPayload);
      groupId = response;
      assert.equal(typeof(response), "string");

      // Then Events

      return service.loadAggregateStream(groupId)
      .then((stream) => {
        const events = stream.events;
        const eventNames = events.map( (event) => event.payload.eventName )

        assert.deepEqual(eventNames, [
          "GroupWasCreated", 
          "SubjectWasChanged",
          "ParticipantWasAdded",  // admin
          "ParticipantWasAdded",  // user 1
          "ParticipantWasAdded" // user 2
        ]);

        assert.equal(events[0].payload.groupId, groupId);

        assert.equal(events[1].payload.groupId, groupId);
        assert.equal(events[1].payload.groupSubject, "This is an automated test");

        assert.equal(events[2].payload.groupId, groupId);
        assert.equal(events[2].payload.admin, true);
        assert.equal(events[2].payload.userId, currentUserId);
        
        assert.equal(events[3].payload.groupId, groupId);
        assert.equal(events[3].payload.admin, false);
        assert.equal(events[3].payload.userId, user1);
        
        assert.equal(events[4].payload.groupId, groupId);
        assert.equal(events[4].payload.admin, false);
        assert.equal(events[4].payload.userId, user2);
      })
    });
  });


  describe('#getAggregateState(aggregate_id)', () => {
    it('should return end-state', async () => {

      // Given Events (using a command)

      const response = await service.createGroup(createGroupPayload);
      groupId = response;

      // Then State

      return service.getAggregateState(groupId)
      .then((reducedState) => {
        assert.equal(reducedState.groupId, groupId);
        assert.equal(reducedState.groupSubject, "This is an automated test");
        assert.equal(reducedState.participants.length, 3);
        assert.equal(reducedState.participants[0].userId, currentUserId);
        assert.equal(reducedState.participants[0].admin, true);
        assert.equal(reducedState.participants[1].userId, user1);
        assert.equal(reducedState.participants[1].admin, false);
        assert.equal(reducedState.participants[2].userId, user2);
        assert.equal(reducedState.participants[2].admin, false);
      })
    });
  });
});