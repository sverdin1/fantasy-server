const express = require('express');
const app = express();

const Datastore = require('nedb');
const { map } = require('underscore');

// Server list database
const servers_db = new Datastore('servers.db');
servers_db.loadDatabase();

// Teams database
const teams_db = new Datastore('teams.db');
teams_db.loadDatabase();

// Players database
const players_db = new Datastore('players.db');
players_db.loadDatabase();

// Join table between "Teams" and "Players"
const team_players_db = new Datastore('team_players.db');
team_players_db.loadDatabase();

// Goals database
const goals_db = new Datastore('goals.db');
goals_db.loadDatabase();

// Matches database
const matches_db = new Datastore('matches.db');
matches_db.loadDatabase();

// Gameweeks database
const gameweeks_db = new Datastore('gameweeks.db');
gameweeks_db.loadDatabase();

// Squads database
const squads_db = new Datastore('squads.db');
squads_db.loadDatabase();

// Player Points database
const points_db = new Datastore('points.db');
points_db.loadDatabase();

// Team Points database
const team_points_db = new Datastore('team_points.db');
team_points_db.loadDatabase();


//  ------------------------------------


// Listening on port 3000.
app.listen(3000);
app.use(express.json());

console.log("Server running")

// Getting the path request and sending the response with text.
app.get('/test', (req, res) => {
  console.log('Connected!');
  res.send('Connected!');
});

// Adds a player to a server
app.post('/add-player', (req, res) => {
  const data = req.body;

  // Step 1: Insert the player with server_id as a foreign key
  players_db.insert({
    name: data.name,
    server_id: data.server_id,
    price: data.price,
    position: data.position
  }, (playerErr, playerDoc) => {
    if (playerErr) {
      return res.status(500).json({ error: "Error inserting player" });
    }

    // Step 2: Optionally ensure the server exists (you can skip this if servers are managed elsewhere)
    servers_db.findOne({ server_id: data.server_id }, (serverErr, serverDoc) => {
      if (serverErr) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!serverDoc) {
        // Server not found — insert a new one
        servers_db.insert({ server_id: data.server_id }, (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: "Error inserting new server" });
          }
          res.status(200).json("Player and server added!");
        });
      } else {
        res.status(200).json("Player added!");
      }
    });
  });
});

// Fetches all players' data for a server
app.get('/players', (req, res) => {
  const serverId = req.query.server_id;

  if (!serverId) {
    return res.status(400).json({ status: "error", message: "Missing server_id query parameter" });
  }

  players_db.find({ server_id: serverId }, (err, players) => {
    if (err) {
      console.error("Error fetching players:", err);
      return res.status(500).json({ status: "error", message: "Database error" });
    }

    if (!players || players.length === 0) {
      return res.status(404).json({ status: "not found", message: "No players found for this server" });
    }

    res.status(200).json({ players: players });
  });
});

// Does exactly the same thing as the function above, I need to remove one of these
app.get('/fetch-players', (req, res) => {
  const server_id = req.query.serverID;

  players_db.find({ "server_id": server_id }, (playerErr, playerDoc) => {
    if (playerErr) {
      res.status(500).json({ error: playerErr });
    }
    else if (playerDoc.length === 0) {
      res.status(404).json({ message: "No players in this position" });
    }
    else {
      res.status(200).json({ players: playerDoc });
    }
  })
})

// Queries whether a user's data is saved
app.get('/user', (req, res) => {
  const user_id = req.query.user_id;

  teams_db.findOne({ "user_id": user_id }, (err, foundData) => {
    if (err) {
      res.status(500).json({ 'status': err });
    }
    else if (foundData.length === 0) {
      res.status(404).json({ "status": "not found" });
    }
    else {
      res.status(200).json({
         "status": "found!",
         'admin' : foundData.admin
      });
    }
  })
})

// Gets all user data (currently just ID's) for a server
app.get('/fetch-users', (req,res) =>{
  const server_id = req.query.serverID;

  teams_db.find({'server_id' : server_id}, (err, foundData) => {
    if(err){
      return res.status(500);
    }
    else if(foundData.length == 0){
      return res.status(404);
    }
    else{
      // Maybe we can send less data to make more efficient
      return res.json({users : foundData}).status(200);
    }
  })
})

app.post('/update-admin', (req, res) => {
  teams_db.find({ user_id : req.body.user_id}, (err, data) => {
    if(data.length == 0){
      return res.status(404).send("No player found with that ID")
    }
    else if(err){
      return res.status(500).json({error : err});
    }
    else if(data[0].admin == 0){ // If user is not an admin, then update their status
      teams_db.update(
          { user_id: req.body.user_id },
          { $set: { admin: 1 } },
          {},
          (err, _) => {
            if (err) {
              return res.status(500).send("Database update failed");
            }
            return res.status(200).send("Update successful");
          }
        );
    }
    return res.status(200).send("User is already an admin");
  })    
});

app.get('/fetch-leaderboard', (req,res) => {
  const server_id = req.query.serverID;

  gameweeks_db.find({ server_id : server_id}, (gwErr, gwData) => {
    if(gwErr){
      return res.status(500).json({error : gwErr});
    }
    else{
      team_points_db.find({gameweek_id : {$in : gwData.map(gw => gw._id)}}, (err, data) => {
        if(err){
      return res.status(500).json({error : err});
        }
        else{
          let team_points_map = {};
          data.forEach(({team_id, team_points}) => {
            if(!team_points_map[team_id]){
              team_points_map[team_id] = 0;
            }
            team_points_map[team_id] += team_points;
          })
          
          let team_points_array = [];
          Object.entries(team_points_map).forEach(([team_id, team_points]) => {
            team_points_array.push({
              team_id : team_id,
              team_points : team_points
            })
          });

          team_points_array = [...team_points_array].sort(
            (a,b) => b.team_points - a.team_points
          );

          return res.status(200).json({team_data : team_points_array});
        }
      })
    }
  })
})

// Called when a user creates a team
app.post('/submit-players', (req, res) => {
  const data = req.body;
  const selectedPlayers = data.selectedPlayers; // Array of player IDs

  // Step 1: Insert the new team (without players array)
  teams_db.insert({
    server_id: data.server_id,
    user_id: data.user_uid,
    team_cost: data.team_cost
  }, (insertErr, newTeam) => {
    if (insertErr) {
      return res.status(500).json({ error: 'Error inserting new team' });
    }

    const teamID = newTeam._id; // or newTeam.team_id depending on your DB setup

    // Step 2: Map each playerID to an entry in the team_players join table
    const teamPlayers = selectedPlayers.map((playerID, index) => ({
      team_id: teamID,
      player_id: playerID,
      position_index: index
    }));

    // Insert all join entries
    team_players_db.insert(teamPlayers, (joinErr) => {
      if (joinErr) {
        return res.status(500).json({ error: 'Error inserting team-player mappings' });
      }
      res.status(200).json("Team and players added!");
      console.log(`New team created with ID: ${teamID}`);
    });
  });
});

app.post('/submit-team-changes', (req, res) => {
  const data = req.body;
  const server_id = data.server_id;
  const new_team = data.selectedPlayers; // array of objects with at least 'player_id'

  teams_db.update(
    { user_id: data.user_uid },                   // query
    { $set: { team_cost: data.team_cost } },      // update
    {},                                           // options
    (err, numReplaced) => {
      if (err) {
        return res.status(500).json({ error: err });
      }

      // Now fetch the updated team document
      teams_db.findOne({ user_id: data.user_uid }, (findErr, doc) => {
        if (findErr || !doc) {
          return res.status(500).json({ error: findErr || "Team not found" });
        }

        // Now proceed with team_players_db logic
        team_players_db.find({ team_id: doc._id }, async (tp_err, old_team_docs) => {
          if (tp_err) {
            return res.status(500).json({ error: tp_err });
          }

          const old_player_ids = old_team_docs.map(p => p.player_id.toString());
          const new_player_ids = data.selectedPlayers.map(p => p.player_id.toString());

          const toDelete = old_team_docs.filter(p => !new_player_ids.includes(p.player_id.toString()));
          const toAdd = data.selectedPlayers.filter(p => !old_player_ids.includes(p.player_id.toString()));

          try {
            // Delete players no longer in team
            const deletePromises = toDelete.map(p =>
              new Promise((resolve, reject) => {
                team_players_db.remove({ _id: p._id }, {}, (err, numRemoved) => {
                  if (err) reject(err);
                  else resolve(p); // return deleted doc
                });
              })
            );

            const deletedDocs = await Promise.all(deletePromises);

            // Add new players using deleted position_index if available
            const addPromises = toAdd.map((p, index) => {
              const position_index = deletedDocs[index] ? deletedDocs[index].position_index : null;
              return new Promise((resolve, reject) => {
                team_players_db.insert(
                  {
                    team_id: doc._id,
                    player_id: p.player_id,
                    position_index: position_index,
                    // add other fields from p if needed
                  },
                  (err, newDoc) => {
                    if (err) reject(err);
                    else resolve(newDoc);
                  }
                );
              });
            });

            await Promise.all(addPromises);

            return res.status(200).json({ success: true });
          } catch (dbErr) {
            return res.status(500).json({ error: dbErr });
          }
        });
      });
    }
  );
});


// Attaches a server_id to a user
app.post('/join-league', (req, res) => {
  const data = req.body;
  const server_id = data.server_id;

  servers_db.find({ "server_id": server_id }, (err, foundData) => {

    if (err) {
      res.status(500).json({ message: 'Error occurred', error: err }); // send error message
    } else if (foundData.length === 0) {
      res.status(404).json({ message: 'Server not found' }); // send "server not found" message
    } else {
      res.status(200).json({ message: 'Server found' }); // send success message
    }
  });
});

// Returns an array of sorted objects from team_players
async function fetchTeam(userID) {
  return new Promise((resolve, reject) => {
    teams_db.find({ user_id: userID }, (err, doc) => {
      if (err) return reject(err);
      if (!doc || doc.length === 0) return resolve([]);

      const team_id = doc[0]._id;

      team_players_db.find({ team_id }, (teamErr, teamDoc) => {
        if (teamErr) return reject(teamErr);
        if (!teamDoc || teamDoc.length === 0) return resolve([]);

        const sorted_team = [...teamDoc].sort(
          (a, b) => a.position_index - b.position_index
        );

        resolve(sorted_team);
      });
    });
  });
}

app.get('/get-team', async (req, res) => {
  const user_id = req.query.userID;

  console.log("Request received")

  try {
    const sorted_team = await fetchTeam(user_id);
    const playerIds = sorted_team.map(player => player.player_id);

    const server_id = await new Promise((resolve, reject) => {
      teams_db.find({ user_id: user_id }, (err, doc) => {
        if (err) {
          console.log("Error fetching server id")
          return reject(err)
        };
        if (!doc || doc.length === 0) return reject("No server found");
        resolve(doc[0].server_id);
      });
    });

    const recent_gameweek_id = await new Promise((resolve, reject) => {
      getRecentGameweek(server_id, (err, doc) => {
        if (err) {
          console.log("Error fetching gameweek id")
          return reject(err);
        }
        resolve(doc.recent_gameweek_id);
      });
    });

    const players = await new Promise((resolve, reject) => {
      players_db.find({ _id: { $in: playerIds } }, (err, docs) => {
        if (err) {
          console.log("Error fetching player info")
          return reject(err);
        }
        resolve(docs);
      });
    });

    //console.log(players);

    const points = await new Promise((resolve, reject) => {
      points_db.find({
        player_id: { $in: playerIds },
        gameweek_id: recent_gameweek_id
      }, (err, docs) => {
        if (err) {
          console.log("Error fetching points")
          return reject(err)
        };
        resolve(docs);
      });
    });

    // Adjusted such that if a player has multiple submissions on a gameweek, their points will be summed!
    const getPoints = (playerId) => {
      const objArray = points.filter(p => p.player_id === playerId);
      const pointsArray = objArray.map(obj => obj.points || 0);
      let totalPoints = 0;
      for (let i = 0; i < pointsArray.length; i++) {
        totalPoints += pointsArray[i];
      }
      return totalPoints;
    }

    const idToName = players.map(item => item.name);

    const player_data = sorted_team.map((obj, index) => ({
      player_id: obj.player_id,
      player_name: idToName[index],
      player_points: getPoints(obj.player_id),
    }));

    res.status(200).json({ team: player_data });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message || error });
  }
});

// Fetches data relating to the team (i.e team name, team cost) given the user_id
app.get('/get-team-data', (req, res) => {
  const user_id = req.query.userID;

  teams_db.findOne({ user_id: user_id }, (err, doc) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    else if (!doc) {
      return res.status(404);
    }
    else {
      return res.status(200).json(doc);
    }
  })
})

// Returns the most recent gameweek, given the server_id
function getRecentGameweek(given_server_id, callback) {
  gameweeks_db.find({ server_id: given_server_id }, (err, docs) => {
    if (err) {
      callback(err, null); // Need to use 'callback' and not 'return' - due to the asynchronous nature of the fetch!
    } else {
      if (docs.length != 0) {
        const date = docs.find(item => item.gameweek == docs.length)?.date_formed;
        const recent_gameweek_id = docs.find(item => item.gameweek == docs.length)?._id;
        console.log("date : " + date);
        callback(null, {
          recent_gameweek: docs.length,
          recent_gameweek_id: recent_gameweek_id,
          gameweek_date: date
        });
      }
      else {
        callback(null, {
          recent_gameweek: 0,
          recent_gameweek_id: null,
          gameweek_date: null
        });
      }
    }
  });
}

// User query to receive the most recent gameweek
app.get('/fetch-recent-gameweek', (req, res) => {
  const server_id = req.query.serverID;
  getRecentGameweek(server_id, (err, data) => {
    if (err) {
      res.status(500).send({ error: err });
    }
    else {
      res.status(200).send(data); // Data is already a JSON object in the form we require for the front-end
    }
  })
})

// Function to calculate the assignment of points
async function calculatePoints(player_id, data) {
  const goal_scorers = data.goal_scorers;
  const assisters = data.assisters;

  return new Promise((resolve, reject) => {
    players_db.findOne({ "_id": player_id }, (err, playerFound) => {
      if (!playerFound || err) {
        console.log("No player found")
        return resolve(0);
      };

      console.log(playerFound);
      const playerPosition = playerFound.position;
      let points = 0;

      if (playerPosition === "Defence") {
        if (data.goals_against === 0) points += 4;
        if (goal_scorers.includes(player_id)) points += 6;
        if (assisters.includes(player_id)) points += 3;
      } else if (playerPosition === "Midfield") {
        if (data.goals_against === 0) points += 1;
        if (goal_scorers.includes(player_id)) points += 4;
        if (assisters.includes(player_id)) points += 3;
      } else if (playerPosition === "Forward") {
        if (goal_scorers.includes(player_id)) points += 4;
        if (assisters.includes(player_id)) points += 3;
      } else if (playerPosition === "GK") {
        if (data.goals_against === 0) points += 6;
        if (goal_scorers.includes(player_id)) points += 6;
        if (assisters.includes(player_id)) points += 3;
      }

      resolve(points);
    });
  });
}

// Asynchronously handles the insert of points data
// Notes : I think I prefer this method of inserting, utilising Promises instead of cascading inserts as I have been doing before.
//         Effectively acheives the same thing as cascading inserts, however is much more readable.#
//         Moving forward - utilise Promises rather than cascading - might need to "npm install nedb-promises" to make it the most efficient
async function handleMatchInsert({ data, squad, goalScorerIds, matchDoc, gameweek_id, res }) {
  try {
    const match_id = matchDoc._id;

    const goal_scorers = goalScorerIds.map((id, index) => ({
      scorer_id: id,
      match_id,
      assisted_by: data.assisters[index]
    }));

    await new Promise((resolve, reject) => {
      goals_db.insert(goal_scorers, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const matchday_squad = squad.map((id) => ({
      player_id: id,
      match_id
    }));

    await new Promise((resolve, reject) => {
      squads_db.insert(matchday_squad, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const player_points = await Promise.all(
      squad.map(async (id) => ({
        points: await calculatePoints(id, data),
        gameweek_id,
        player_id: id
      }))
    );

    await new Promise((resolve, reject) => {
      points_db.insert(player_points, (err) => {
        if (err) return reject(err);
        resolve();
      });
    }); 

    await new Promise((resolve, reject) => {
      team_players_db.find({ player_id: { $in: squad } }, (err, playerMappings) => {
        if (err) return reject(err);

        // Map player_id -> team_id
        const playerToTeam = {};
        playerMappings.forEach(({ player_id, team_id }) => {
          playerToTeam[player_id] = team_id;
        });

        // Aggregate total points per team
        const teamPointsMap = {};
        player_points.forEach(({ player_id, points }) => {
          const team_id = playerToTeam[player_id];
          if (!team_id) return;
          teamPointsMap[team_id] = (teamPointsMap[team_id] || 0) + points;
        });

        // Process each team
        let pending = Object.keys(teamPointsMap).length;
        if (pending === 0) return resolve();

        Object.entries(teamPointsMap).forEach(([team_id, pointsToAdd]) => {
          team_points_db.find({ team_id, gameweek_id }, (findErr, existing) => {
            if (findErr) return reject(findErr);

            if (existing.length === 0) {
              team_points_db.insert(
                { gameweek_id, team_id, team_points: pointsToAdd },
                (insertErr) => {
                  if (insertErr) return reject(insertErr);
                  if (--pending === 0) resolve();
                }
              );
            } else {
              team_points_db.update(
                { team_id, gameweek_id },
                { $inc: { team_points: pointsToAdd } },
                {},
                (updateErr) => {
                  if (updateErr) return reject(updateErr);
                  if (--pending === 0) resolve();
                }
              );
            }
          });
        });
      });
    });

    console.log("worked");

    return res.status(200).send({
      message: "Match, goal scorers, squad, and points saved successfully."
    });

  } catch (err) {
    console.error("Error in handleMatchInsert:", err);
    return res.status(500).send({ error: 'Failed to process match data', details: err });
  }
}

// Where we handle the submission of a match result
app.post('/submit-result', (req, res) => {
  const data = req.body;
  const goalScorerIds = data.goal_scorers;
  const squad = data.squad;

  getRecentGameweek(data.server_id, (err, gameweekData) => {
    if (err) {
      return res.status(500).send({ error: "Issue fetching recent gameweek" });
    }

    if (data.new_gameweek == 1) {
      gameweeks_db.insert({
        gameweek: gameweekData.recent_gameweek + 1,
        date_formed: Date.now(),
        server_id: data.server_id
      }, (err, gameweekDoc) => {
        if (err) return res.status(500).send({ error: err });

        const gameweek_id = gameweekDoc._id;

        matches_db.insert({
          opposition: data.opposition,
          goals_for: data.goals_for,
          goals_against: data.goals_against,
          gameweek_id
        }, (err, matchDoc) => {
          if (err) return res.status(500).send({ error: 'Failed to insert match', details: err });

          handleMatchInsert({ data, squad, goalScorerIds, matchDoc, gameweek_id, res });
        });
      });
    } else {
      gameweeks_db.findOne({ server_id: data.server_id, gameweek: gameweekData.recent_gameweek }, (err, gameweekDoc) => {
        if (err) return res.status(500).send({ error: err });

        const gameweek_id = gameweekDoc._id;

        matches_db.insert({
          opposition: data.opposition,
          goals_for: data.goals_for,
          goals_against: data.goals_against,
          gameweek_id
        }, (err, matchDoc) => {
          if (err) return res.status(500).send({ error: 'Failed to insert match', details: err });

          handleMatchInsert({ data, squad, goalScorerIds, matchDoc, gameweek_id, res });
        });
      });
    }
  });
});

