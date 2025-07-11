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

app.post('/add-player', (req, res) => {
  const data = req.body;

  // Step 1: Insert the player with server_id as a foreign key
  players_db.insert({
    name: data.name,
    server_id: data.server_id
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


app.get('/user', (req,res) => {
  const user_id = req.query.user_id;

  teams_db.find({"user_id" : user_id}, (err, foundData)=>{
    if(err){
      res.status(500).json({'status' : err});
    }
    else if(foundData.length === 0){
      res.status(404).json({"status" : "not found"});
    }
    else{
      res.status(200).json({"status" : "found!"})
    }
  })
})

app.post('/submitPlayers', (req, res) => {
  const data = req.body;
  const selectedPlayers = data.selectedPlayers; // Array of player IDs

  // Step 1: Insert the new team (without players array)
  teams_db.insert({
    server_id: data.server_id,
    user_id: data.user_uid
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

app.get('/fetch-players', (req,res) => {
  const server_id = req.query.serverID;

  players_db.find({"server_id" : server_id}, (playerErr, playerDoc) => {
    if(playerErr){
      res.status(500).json({error : playerErr});
    }
    else if (playerDoc.length === 0){
      res.status(404).json({message : "No players in this position"});
    }
    else{
      res.status(200).json({players : playerDoc});
    }
  })
})

app.get('/get-team', (req, res) => {
  const user_id = req.query.userID;

  teams_db.find({"user_id" : user_id}, (err, doc) => {
    if(err){
      res.status(500).json({error : err});
    }
    else if(!doc){
      res.status(404).json({message : "not found"})
    }
    else{
      team_id = doc[0]._id;
      team_players_db.find({"team_id" : team_id}, (teamErr, teamDoc) => {
        if(teamErr){
          res.status(500).json({error : teamErr})
        }
        else if(!teamDoc){
          res.status(404).json({message : "not found"});
        }
        else{
          const sorted_team = [...teamDoc].sort(
            (a, b) => a.position_index - b.position_index
          );
          
          // NEED res.json code completed

          // sorted_team contains an array of player_ids, ordered by their position_index
          // player_id maps to _id in the players.db file (denoted by players_db in the index.js file)
          // we need the array sorted_team (containing player_id - not useful to the end user) to map to "name" which is a field in players_db

          // TASK : complete the mapping of "player_id" to "name" in the players.db file and send the array as res.json

          const playerIds = sorted_team.map(player => player.player_id);

          players_db.find({ _id: { $in: playerIds } }, (playerErr, players) => {
            if (playerErr) {
              res.status(500).json({ error: playerErr });
            } else {
              const idToName = {};
              players.forEach(p => {
                idToName[p._id] = p.name;
              });

              const playerNames = sorted_team.map(player => idToName[player.player_id]);

              res.json({ team: playerNames }).status(200);
            }
          });
        }
      })
    }
  })
})

function getRecentGameweek(given_server_id, callback) {
  gameweeks_db.find({ server_id: given_server_id }, (err, docs) => {
    if (err) {
      callback(err, null); // Need to use 'callback' and not 'return' - due to the asynchronous nature of the fetch!
    } else {
      if(docs.length != 0){
        const date = docs.find(item => item.gameweek == docs.length)?.date_formed;
        console.log("date : " + date);
        callback(null, {
          recent_gameweek : docs.length,
          gameweek_date : date
        });
      }
      else{
        callback(null, {
          recent_gameweek : 0,
          gameweek_date : null
        });
      }
    }
  });
}

app.get('/fetch-recent-gameweek', (req, res) => {
  const server_id = req.query.serverID;
  getRecentGameweek(server_id, (err, data) => {
    if(err){
      res.status(500).send({error : err});
    }
    else{
      res.status(200).send(data); // Data is already a JSON object in the form we require for the front-end
    }
  })
})

app.post('/submit-result', (req, res) => {
  const data = req.body;
  const goalScorerIds = data.goal_scorers;
  const squad = data.squad;

  // Fetching most recent gameweek from database
  getRecentGameweek(data.server_id, (err, gameweekData) =>{
    if(err){
      return res.status(500).send({error : "Issue fetching recent gameweek"});
    }

    console.log(data);
    console.log("data.new_gameweek : " + data.new_gameweek);
  
    // CREATE NEW GAMEWEEK
    if(data.new_gameweek == 1){
      gameweeks_db.insert({
        gameweek : gameweekData.recent_gameweek + 1, // Incrementing most recent gameweek
        date_formed : Date.now(),
        server_id : data.server_id
      }, (err, gameweekDoc) => {
        if(err){
          return res.status(500).send({error : err});
        }

        const gameweek_id = gameweekDoc._id;

        // First create the match entry
        matches_db.insert({
          opposition: data.opposition,
          goals_for: data.goals_for,
          goals_against: data.goals_against,
          gameweek_id : gameweek_id
        }, (err, matchDoc) => {
          if (err) {
            return res.status(500).send({ error: 'Failed to insert match', details: err });
          }

          const match_id = matchDoc._id;
            
          const goal_scorers = goalScorerIds.map((id) => ({
            scorer_id: id,
            match_id: match_id
            // Add more attributes later:
            // assisted: data.assist_id,
            // minute: data.min
          }));

          // Once the match entry has been created - insert match_id into goals_db
          goals_db.insert(goal_scorers, (err) => {
            if (err) {
              return res.status(500).send({ error: 'Failed to insert goal scorers', details: err });
            }

            console.log("Goal scorers added");
              
            // Adding matchday squad
            
            const matchday_squad = squad.map((id) => ({
              player_id : id,
              match_id : match_id})
            ); 
            
            squads_db.insert(matchday_squad, (err) => {
              if(err){
                return res.status(500).send({error : err});
              }
              else{
                return res.status(200).send({ message: "Match and goal scorers and squad saved successfully." }); 
              }
            })
          });
        });
      });
    }
    // This should never be called if there isn't already an existing gameweek (validated by the front end)
    else{
      gameweeks_db.findOne({server_id : data.server_id, gameweek : gameweekData.recent_gameweek}, (err, foundData) => {
        if(err){
          return res.status(500).send({error : err});
        }

        const gameweek_id = foundData._id; // Finding the most recent gameweek_id

        // First create the match entry
        matches_db.insert({
          opposition: data.opposition,
          goals_for: data.goals_for,
          goals_against: data.goals_against,
          gameweek_id : gameweek_id
        }, (err, matchDoc) => {
          if (err) {
            return res.status(500).send({ error: 'Failed to insert match', details: err });
          }

          const match_id = matchDoc._id;
            
          const goal_scorers = goalScorerIds.map((id, index) => ({
            scorer_id: id,
            match_id: match_id,
            assisted_by: data.assisters[index]
            // Add more attributes later:
            // assisted: data.assist_id,
            // minute: data.min
          }));

          // Once the match entry has been created - insert match_id into goals_db
          goals_db.insert(goal_scorers, (err) => {
            if (err) {
              return res.status(500).send({ error: 'Failed to insert goal scorers', details: err });
            }

            console.log("Goal scorers added");
            
            // Adding matchday squad
            
            const matchday_squad = squad.map((id) => ({
              player_id : id,
              match_id : match_id})
            ); 
            
            squads_db.insert(matchday_squad, (err) => {
              if(err){
                return res.status(500).send({error : err});
              }
              else{
                return res.status(200).send({ message: "Match and goal scorers and squad saved successfully." }); 
              }
            })
          });
        });
      })
    }
  });
});