const express = require("express");
const app = express();

// app.listen(3000, () => {
//     console.log("El servidor está inicializado en el puerto 3000");
//    });

//require our websocket library 
var WebSocketServer = require('ws').Server; 

//creating a websocket server at port 9090 
var wss = new WebSocketServer({port: 3001}); 

wss.broadcast = function(data, sender) {
    wss.clients.forEach(function(client) {
      if (client !== sender) {
        client.send(data);
      }
    })
  }
//all connected to the server users 
var users = {};
var jobId =0;
wss.on('request', function (request) {
   const query = request.resourceURL.query;
   if (query.delay) {
    setTimeout(() => request.accept(), query.delay);
   } else if (query.reject) {
    request.reject();
   } else {
    request.accept();
   }
  });
//when a user connects to our sever 
wss.on('connection', function connection(connection, request) {
  
   console.log("User connected");
	const current_url = new URL('http://cmt.com'+request.url);
   const search_params = current_url.searchParams;
   jobId = search_params.get('jobId');
   jobId = search_params.get('userName');

   //when server gets a message from a connected user 
   connection.on('message', function(message) { 
	
      var data;
      //accepting only JSON messages 
      try { 
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      }
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login 
         case "login": 
            console.log("User logged", data.name); 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(connection, { 
                  type: "login", 
                  success: false 
               }); 
            } else { 
               //save user connection on the server 
               users[data.name] = connection; 
               connection.name = data.name;
				console.log(connection);	
               sendTo(connection, { 
                  type: "login", 
                  success: true,
                  usersList: users
               }); 
               // wss.broadcast(JSON.stringify(users), wss);
            } 
				
            break;
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name); 
				
            //if UserB exists then send him offer details 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               //setting that UserA connected with UserB 
               connection.otherName = data.name; 
					
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: connection.name 
               }); 
            } 
				
            break;
				
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               connection.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               });
            } 
				
            break;
				
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
            var conn = users[data.name];  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               }); 
            } 
				
            break;
				
         case "leave": 
            console.log("Disconnecting from", data.name); 
            var conn = users[data.name]; 
            conn.otherName = null; 
				
            //notify the other user so he can disconnect his peer connection 
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }  
				
            break;
				
         default: 
            sendTo(connection, { 
               type: "error", 
               message: "Command not found: " + data.type 
            });
				
            break; 
      }  
   });
	
   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   connection.on("close", function() { 
	
      if(connection.name) { 
         delete users[connection.name]; 
			
         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName); 
            var conn = users[connection.otherName]; 
            conn.otherName = null;  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
              }); 
            }  
         } 
      } 
   });  
	
   connection.send("Hello world"); 
}); 
 
function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}

function retrieveUsersList() {
    
}

app.get('/users', function (req, res) {
    res.send(users);
  });