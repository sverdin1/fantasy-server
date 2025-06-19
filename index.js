const express = require('express');
const app = express();

const Datastore = require('nedb');

//Server list database
const servers_db = new Datastore('servers.db');
servers_db.loadDatabase();

//Teams database
const teams_db = new Datastore('teams.db');
teams_db.loadDatabase();

//Players database
const players_db = new Datastore('players.db');
players_db.loadDatabase();

//Join table between "Teams" and "Players"
const team_players_db = new Datastore('team_players.db');
team_players_db.loadDatabase();

//Goals database
const goals_db = new Datastore('goals.db');
goals_db.loadDatabase();

//Matches database
const matches_db = new Datastore('matches.db');
matches_db.loadDatabase();


//  ------------------------------------


// Listening on port 3000.
app.listen(3000);
app.use(express.json());

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
    const teamPlayers = selectedPlayers.map(playerID => ({
      team_id: teamID,
      player_id: playerID
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

app.post('/submit-match', (req, res) => {
  const data = req.body;
  const goalScorers = data.scorers; // array of IDs of goal scorers (foreign key)

  
})