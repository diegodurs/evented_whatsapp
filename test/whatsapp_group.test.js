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

  describe('#addParticipant()', () => {
    it('should emit an event', async () => {

      // Given Events (using command)

      const groupId = await service.createGroup(createGroupPayload);

      // When Command

      const user3 = uid();

      const response = await service.addParticipant({
        groupId: groupId, userId: user3, admin: false
      });
      
      // Then Events

      return service.loadAggregateStream(groupId)
      .then((stream) => {
        const events = stream.events;

        // assert new event
        assert.equal(6, events.length);

        const last_event = events.pop()
        assert.equal(last_event.payload.eventName, 'ParticipantWasAdded')
        assert.equal(last_event.payload.groupId, groupId);
        assert.equal(last_event.payload.admin, false);
        assert.equal(last_event.payload.userId, user3);
      })
    });
  });

  describe('#removeParticipant()', () => {
    it('should emit an event if userId present', async () => {

      // Given Events (using command)

      const groupId = await service.createGroup(createGroupPayload);

      // When Command

      const response = await service.removeParticipant({
        groupId: groupId, userId: user2
      });
      
      // Then Events

      return service.loadAggregateStream(groupId)
      .then((stream) => {
        const events = stream.events;

        // assert new event
        assert.equal(6, events.length);

        const last_event = events.pop()
        assert.equal(last_event.payload.eventName, 'ParticipantWasRemoved')
        assert.equal(last_event.payload.groupId, groupId);
        assert.equal(last_event.payload.userId, user2);
      })
    });

    it('should return an error userId is not in the participant', async () => {

      // Given Events (using command)

      const groupId = await service.createGroup(createGroupPayload);

      // When Command

      const user3 = uid();

      service.removeParticipant({
        groupId: groupId, userId: user3
      }).then((_) => { 
        // should not happen
        assert.ok(!false)
      }).catch((error) => {
        assert.equal(error, 'userId does not belong to the Group')
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