const http = require("http");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
// const socketIO = require("socket.io");
const { ObjectId, Db } = require("mongodb");
const Mongoclient = require("mongodb").MongoClient;

// const socketApp = express();
// const socketServer = http.createServer(socketApp);
// const io = socketIO(socketServer);
// const socketPORT = process.env.SOCKET_PORT || 5050;
// socketApp.use(cors());

const DBApp = express();
const dbPORT = process.env.DB_PORT || 5040;
DBApp.use(cors());
DBApp.use(bodyParser.json());
DBApp.use(
    bodyParser.urlencoded({extended: true})
)

// const router = require("./router");

// socketApp.use(router);

// socketServer.listen(socketPORT, () =>{
//     console.log(`Socket Server Connected on PORT ${socketPORT}`);
// });



var CONNECTION_STRING = "mongodb+srv://admin:arshia1379@cluster0.fiiwyu6.mongodb.net/?retryWrites=true&w=majority"
var DATABASE_NAME = "ChatRoom";
var database; 

DBApp.listen(dbPORT, () =>{
    Mongoclient.connect(CONNECTION_STRING, async(error, client)=>{
        database = await client.db(DATABASE_NAME);
        console.log(`MongoDB connection successful on PORT ${dbPORT}`);
    })

}) 

// DBApp.get('/', (req, res) =>{
//     database.collection("Chats").find({}).toArray((err,result)=>{
//         if(err){
//             res.send(err)
//         }
//         res.send(result[0])
//     })

// })

// DBApp.get('/login', (req,res)=>{
//     res.send(JSON.stringify(data));
// })

DBApp.post('/getUser', multer().none(), (req,res) => {
    database.collection("Users").findOne({_id: ObjectId(req.body.userID)},(err, result) =>{
        if(err){
            res.send(err)
        }else if(result){
            res.send(result)
        }else{
            console.log("Other case2")
        }
    }) 
})

DBApp.post('/login', multer().none(), (req, res) =>{
    // const newData = req.body;
    // var id;
    // var chatRoomID = ObjectId("650e4dbc20d79d145e1935f5");
    
    // const newData = {
    //     text: "multer was added",
    //     time: "2023-11-19",
    //     from: "harry"
    // }
    // // To upload to db message array based on chatroom ID
    // database.collection("Chats").updateOne({"_id":chatRoomID}, {$push: {"message": newData}}, (err, result) =>{
    //     if(err){console.log(err); res.send(err); return;}
    //     if(result)
    //     {
    //         res.send(`Nice \n ${result}`)
    //     }
    //     else{
    //         res.send("fuck")
    //     }
    // });

    database.collection("Users").findOne({username: req.body.username, password: req.body.password}, (err,result)=>{
        if(err){
            res.send(err);
        }else if(result){
            res.send(result._id);
        }else{
            res.send("m-User was not found. Try Again");
        }
        
    })
})

DBApp.post('/signup', multer().none(), async (req, res) =>{
    let doesUserExit;

    // Check to see if the user is already exists
    database.collection("Users").findOne({username: req.body.username}, (err,result)=>{
        if(err){
            res.send(err);
        }else if(result){
            res.send("m-Username already exists. Try another username");
            doesUserExit = true;
        }else{
            doesUserExit = false;
        }
    })

    if(doesUserExit === true) return;

    const data = req.body;
    //If the username does not exist, add the user
    const result = await database.collection("Users").insertOne({
        name: data.name,
        username: data.username,
        password: data.password,
        avatarPic: data.avatarPic,
        chatRoomIDList: []
    })
    
    if(result == null) { res.send("m-Something went wrong while adding the new user"); return;}

    res.send(result.insertedId);
})

DBApp.post('/getUserChatRoomList',multer().none(), async(req,res) =>{
    const ids = req.body.chatRoomIDList;
    const objIDs = ids.map((id) => {
        return ObjectId(id);
    })

    const matchStage = {
        $match: {
          _id: { $in: objIDs },
        },
    };

    const unwindStage = {
        $unwind: "$participants",
    };

    const lookupStage = {
        $lookup: {
          from: "Users",
          localField: "participants",
          foreignField: "_id",
          as: "Users",
        },
    };

    const pipeline = [matchStage, unwindStage, lookupStage,
        {
            $group: {
              _id: '$_id',
              chatRoomID: { $first: '$chatRoomID' },
              message: { $first: '$message' },
              isGroupChat: { $first: '$isGroupChat' },
              groupName: {$first: '$groupName'},
            //   participants: { $first: '$participants' },
              Users: { $push: '$Users' },
            },
        },
        {
            $sort: {
                _id: -1
            }
        },
        {
            $project: {
                _id: 1,
                chatRoomID: 1,
                message: 1,
                isGroupChat: 1,
                participants: 1,
                groupName: 1,
                participants: {
                    $map: {
                        input: '$Users',
                        as: 'data',
                        in: {
                            name: { $arrayElemAt: ['$$data.name', 0] },
                            username: { $arrayElemAt: ['$$data.username', 0] },
                            avatarPic: { $arrayElemAt: ['$$data.avatarPic', 0] },
                        },
                    },
                }
            }
        }
    ]

    const result = await database.collection("Chats").aggregate(pipeline).toArray();
    
    res.send(result)
})