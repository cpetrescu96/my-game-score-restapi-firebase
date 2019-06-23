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
app.get('/games', async (request, response) => {
  try {
    const arr: Array<Object> = [];

    await db
      .collection('games')
      .orderBy('name')
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

    if (!arr.length) {
      response
        .status(404)
        .send("Games don't exist. Please populate the database!");
    }

    response.status(200).json(arr);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.post('/games', async (request, response) => {
  try {
    const name: string = request.body.name.trim();
    if (!name || name.toString().length < 2 || name.toString().length > 75) {
      response
        .status(400)
        .send(
          'Error 400. Every game has to have a valid name with a length between 3 and 75 characters.'
        );
      return;
    }
    const players: Array<Object> = request.body.players;
    const playersWithScores = players.map(x => {
      if (x && x.toString().length > 2 && x.toString().length < 20) {
        return { name: x.toString().trim(), scores: [0] };
      } else {
        response
          .status(400)
          .send(
            'Error 400. Every player has to have a valid name with a length between 3 and 20 characters.'
          );
        return;
      }
    });
    const data = {
      name: name,
      players: playersWithScores
    };
    const gameRef = await db.collection('games').add(data);
    const game = await gameRef.get();

    response.status(201).json({
      id: gameRef.id,
      name: game.data()!.name,
      players: game.data()!.players
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/games/:id', async (request, response) => {
  try {
    let document: Object = {};
    const gameId: string = request.params.id;

    if (!gameId) throw new Error('Game ID is required.');

    await db
      .collection('games')
      .doc(gameId)
      .get()
      .then(documentSnapshot => {
        if (!documentSnapshot.exists) {
          response.status(404).send("Error 404 Game doesn't exists.");
        }

        document = {
          id: documentSnapshot.id,
          name: documentSnapshot.data()!.name,
          players: documentSnapshot.data()!.players
        };
      });

    response.status(200).json(document);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.put('/games/:id', async (request, response) => {
  try {
    const gameId: string = request.params.id;
    let scores: Array<number> = request.body.scores;
    let gamePlayers: Array<any> = [];
    let name: string = '';

    if (!gameId) throw new Error('Id is required.');

    scores = scores.map(x => {
      if (x && typeof x === 'number') {
        return x;
      } else {
        response
          .status(400)
          .send('Error 400. Every score has to be a valid number.');
        return x;
      }
    });

    await db
      .collection('games')
      .doc(gameId)
      .get()
      .then(documentSnapshot => {
        if (!documentSnapshot.exists) {
          response.status(404).send("Error 404 Game doesn't exist.");
          return;
        }
        gamePlayers = documentSnapshot.data()!.players;
        name = documentSnapshot.data()!.name;
      });

    scores.map((x, i) => {
      gamePlayers[i].scores = [...gamePlayers[i].scores, x];
    });

    const data = {
      name: name,
      players: gamePlayers
    };

    await db
      .collection('games')
      .doc(gameId)
      .set(data, { merge: true });

    response.status(200).json({
      id: gameId,
      ...data
    });
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
          response.status(404).send('Error 404. This game does not exists.');
        }
      });

    await db
      .collection('games')
      .doc(gameId)
      .delete();

    response.status(200).json({
      id: gameId
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

/// DESCRIPTION ROUTES

app.get('/descriptions', async (request, response) => {
  try {
    const arr: Array<Object> = [];

    await db
      .collection('descriptions')
      .orderBy('name')
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
          response
            .status(404)
            .send(
              "Descriptions of games don't exist. Please populate the database!"
            );
        }
        response.status(200).json(arr);
      });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.post('/descriptions', async (request, response) => {
  try {
    const name: string = request.body.name.trim();
    const description: string = request.body.description.trim();

    if (!name || name.length > 75 || name.length < 2) {
      response
        .status(400)
        .send(
          'Error 400. The name has to have a length between 2 and 75 chars.'
        );
      return;
    }

    await db
      .collection('descriptions')
      .orderBy('name')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(function(doc) {
          if (doc.data().name === name) {
            response
              .status(400)
              .send(
                'Error 400. This name is already taken for a game description, search for it in the list or rename your version of the game.'
              );
            return;
          }
        });
      });

    if (!description || description.length > 3000 || description.length < 100) {
      response
        .status(400)
        .send(
          'Error 400. The description has to have a length between 100 and 3000 chars.'
        );
      return;
    }
    const data = {
      name: name,
      description: description,
      isDefaultField: false
    };
    const descriptionRef = await db.collection('descriptions').add(data);
    const descriptionData = await descriptionRef.get();

    response.status(201).json({
      id: descriptionRef.id,
      name: descriptionData.data()!.name,
      description: descriptionData.data()!.description
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId: string = request.params.id;

    if (!descriptionId) throw new Error('description ID is required');

    const description = await db
      .collection('descriptions')
      .doc(descriptionId)
      .get();

    if (!description.exists) {
      response
        .status(404)
        .send('Error 404. The game description has not been found.');
    }

    response.status(200).json({
      id: description.id,
      name: description.data()!.name,
      description: description.data()!.description,
      isDefaultField: description.data()!.isDefaultField
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.put('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId = request.params.id;
    const name: string = request.body.name.trim();
    const description: string = request.body.description.trim();

    if (!descriptionId) throw new Error('Id is blank');

    if (!name || name.length < 2 || name.length > 75) {
      response
        .status(400)
        .send(
          'Error 400. The name has to have a valid value and a length between 2 and 75 chars'
        );
      return;
    }

    if (!description || description.length < 100 || description.length > 3000) {
      response
        .status(400)
        .send(
          'Error 400. The description has to have a valid value and a length between 100 and 3000 chars'
        );
      return;
    }

    await db
      .collection('descriptions')
      .doc(descriptionId)
      .get()
      .then(documentSnapshot => {
        if (!documentSnapshot.exists) {
          response
            .status(404)
            .send("Error 404. Game description doesn't exist.");
          return;
        }
        if (documentSnapshot.data()!.isDefaultField === true) {
          response
            .status(400)
            .send(
              'Error 400. This game description cannot be updated, this is one of the default games. Please make your own set of rules if you want to play another way.'
            );
          return;
        }
      });

    const data = {
      name,
      description
    };

    await db
      .collection('descriptions')
      .doc(descriptionId)
      .set(data, { merge: true });

    response.status(200).json({
      id: descriptionId,
      ...data
    });
  } catch (error) {
    response.status(500).send(error);
  }
});

app.delete('/descriptions/:id', async (request, response) => {
  try {
    const descriptionId = request.params.id;

    if (!descriptionId) throw new Error('Id is required');

    await db
      .collection('descriptions')
      .doc(descriptionId)
      .get()
      .then(documentSnapshot => {
        if (!documentSnapshot.exists) {
          response
            .status(404)
            .send('Error 404. Game description not found to be deleted.');
          return;
        }
      });

    await db
      .collection('descriptions')
      .doc(descriptionId)
      .delete();

    response.status(200).json({
      id: descriptionId
    });
  } catch (error) {
    response.status(500).send(error);
  }
});
