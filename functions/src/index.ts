import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from 'body-parser';

admin.initializeApp(functions.config().firebase);

const app = express();
const main = express();

main.use('/api/v1', app);
main.use(bodyParser.json());

export const webApi = functions.https.onRequest(main);

const db = admin.firestore();

/// GAMES ROUTES
app.get('/games', async (req, res) => {
  try {
    const arr: Array<Object> = [];

    await db
      .collection('games')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(function(doc) {
          arr.push({
            id: doc.id,
            name: doc.data().name,
            players: doc.data().players
          });
        });
      });

    res.json(arr);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/games', async (request, response) => {
  try {
    const name: string = request.body.name;
    const players: Array<Object> = request.body.players;
    const playersWithScores = players.map(x => {
      return { name: x, scores: [0] };
    });
    const data = {
      name: name,
      players: playersWithScores
    };
    const gameRef = await db.collection('games').add(data);
    const game = await gameRef.get();

    response.json({
      id: gameRef.id,
      data: game.data()
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/games/:id', async (request, response) => {
  try {
    let document: Object = {};
    const gameId: string = request.params.id;
    const doc = await db.collection('games').doc(gameId);

    if (!gameId) throw new Error('Game ID is required');

    if (doc) {
      await db
        .collection('games')
        .doc(gameId)
        .get()
        .then(documentSnapshot => {
          if (!documentSnapshot.exists) {
            response
              .status(404)
              .send(new Error("Error 404 Game doesn't exists"));
          }

          document = {
            id: gameId,
            name: documentSnapshot.data()!.name,
            players: documentSnapshot.data()!.players
          };
        });
    } else {
      //throw new Error('Error 404 Game does not exists');
      response.status(404).send(new Error('Error 404 Game does not exists'));
    }

    response.json(document);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.put('/games/:id', async (request, response) => {
  try {
    const gameId: string = request.params.id;
    const scores: Array<number> = request.body.scores;

    if (!gameId) throw new Error('Id is required');

    const doc = await db.collection('games').doc(gameId);

    let gamePlayers: Array<any> = [];

    if (doc) {
      await db
        .collection('games')
        .doc(gameId)
        .get()
        .then(documentSnapshot => {
          if (!documentSnapshot.exists) {
            throw new Error("Error 404 Game doesn't exist.");
          }
          gamePlayers = documentSnapshot.data()!.players;
        });

      scores.map((x, i) => {
        gamePlayers[i].scores = [...gamePlayers[i].scores, x];
      });

      const data = {
        players: gamePlayers
      };
      await db
        .collection('games')
        .doc(gameId)
        .set(data, { merge: true });

      response.json({
        id: gameId,
        data
      });
    } else {
      throw new Error('Error 404 Game does not exists');
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

app.delete('/games/:id', async (request, response) => {
  try {
    const gameId = request.params.id;

    if (!gameId) throw new Error('id is required');

    await db
      .collection('games')
      .doc(gameId)
      .get()
      .then(documentSnapshot => {
        if (!documentSnapshot.exists) {
          throw new Error("Error 404 Game doesn't exist.");
        }
      });

    const doc = await db.collection('games').doc(gameId);
    if (doc) {
      await db
        .collection('games')
        .doc(gameId)
        .delete();

      response.json({
        id: gameId
      });
    } else {
      throw new Error('Error 404 Game does not exists');
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

/// DESCRIPTION ROUTES

app.get('/descriptions', async (req, res) => {
  try {
    const arr: Array<Object> = [];

    await db
      .collection('descriptions')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(function(doc) {
          arr.push({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description,
            isDefaultField: doc.data().isDefaultField
          });
        });

        if (!arr.length) {
          throw new Error("Descriptions of games don't exist.");
        }
        res.json(arr);
      });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/descriptions', async (request, response) => {
  try {
    const name: string = request.body.name;
    const description: string = request.body.players;
    const data = {
      name: name,
      description: description,
      isDefaultField: false
    };
    const descriptionRef = await db.collection('descriptions').add(data);
    const descriptionData = await descriptionRef.get();

    response.json({
      id: descriptionRef.id,
      name: descriptionData.data()!.name,
      description: descriptionData.data()!.description,
      isDefaultField: descriptionData.data()!.isDefaultField
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId: string = request.params.id;

    if (!descriptionId) throw new Error('description ID is required');

    const doc = await db.collection('descriptions').doc(descriptionId);
    if (doc) {
      const description = await db
        .collection('descriptions')
        .doc(descriptionId)
        .get();

      if (!description.exists) {
        throw new Error("Error 404 Description Game doesn't exist.");
      }

      response.json({
        id: description.id,
        name: description.data()!.name,
        description: description.data()!.description,
        isDefaultField: description.data()!.isDefaultField
      });
    } else {
      throw new Error('Error 404 Description Game does not exists');
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

app.put('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId = request.params.id;
    const name: string = request.body.name;
    const description: string = request.body.description;

    if (!descriptionId) throw new Error('Id is blank');

    if (!name) throw new Error('Name is required');
    if (!description) throw new Error('Description is required');

    const doc = await db.collection('descriptions').doc(descriptionId);
    if (doc) {
      const data = {
        name,
        description
      };
      await db
        .collection('descriptions')
        .doc(descriptionId)
        .set(data, { merge: true });

      response.json({
        id: descriptionId,
        ...data
      });
    } else {
      throw new Error('Error 404 Description Game does not exists');
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

app.delete('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId = request.params.id;

    if (!descriptionId) throw new Error('Id is required');

    const doc = await db.collection('descriptions').doc(descriptionId);
    if (doc) {
      await db
        .collection('descriptions')
        .doc(descriptionId)
        .delete();

      response.json({
        id: descriptionId
      });
    } else {
      throw new Error('Error 404 Description Game does not exists');
    }
  } catch (error) {
    response.status(500).send(error);
  }
});
