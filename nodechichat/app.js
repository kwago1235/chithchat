const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mysql = require("mysql2");
const app = express();
const server = http.createServer(app);
const io = socketio(server, {autoConnect: false});
const sessions = require('express-session');
const oneDay = 1000 * 60 * 60 * 24;
let socketsConencted = new Set();

var sessionMiddleware = sessions({
    secret: 'eg[isfd-8yF9-7w2315df{}+Ijsli;;to8',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: oneDay,
        secure: false, 
    },
});

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chichat"
});


app.set('trust proxy', 1) // trust first proxy
app.set('view engine', 'hbs')
app.use(express.urlencoded({ extended: 'false' }))
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.get("/", (req, res) => {

    if(req.session.user){
        res.redirect("/chat");
    }else{
        res.render('login');
    }
});

app.get("/login/", (req, res) => {

    if(req.session.user){
        res.redirect("/chat");
    }else{
        res.render('login');
    }
})

app.get("/signup/", (req, res) => {
    if(req.session.user){
        res.redirect("/chat");
    }else{
        res.render('signup');
    }
})
app.get( '/logout', function (req, res) {
    req.session.destroy(function ( ) {
        console.log( "User logged out! " ) ;
    });
    res.redirect('/');
});
app.post("/auth/signup", (req, res) => {
    const { username, password } = req.body;
    con.query('SELECT username FROM accounts WHERE username = ?', [username], async (error, result) => {
        if (error) {
            console.log(error);
        }

        if (result.length > 0) {
            return res.render('signup', {
                message: 'This username is already in use'
            })
        } else {
            con.query('INSERT INTO accounts SET?', { username: username, password: password }, (error, result) => {
                if (error) {
                    console.log(error)
                } else {
                    return res.render('signup', {
                        message: 'User registered!'
                    })
                }
            })
        }
    })
});

app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    con.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], async (error, result) => {
        if (error) {
            console.log(error);
        }

        if (result.length > 0) {
            req.session.user = username;
            req.session.userid = result[0].acc_id;
            return res.redirect('/inbox');
        } else {
            return res.render('login', {
                message: 'Invalid username or password'
            })
        }
    })
});



app.get("/inbox/:id", (req, res) => {
    if(req.session.user){
        res.render("chat", {userid : req.session.userid});
    }else{
        res.redirect('/login');
    }
})

app.get("/inbox/", (req, res) => {
    if(req.session.user){
        res.render("chat", {userid : req.session.userid});
    }else{
        res.redirect('/login');
    }
})


io.on("connection", (socket) => {
    console.log("connected " + socket.id);
    const data = {
        id: socket.id,
        name: socket.request.session.user

    }


    socket.on("message", (message) => {
        const senderSession = socket.request.session; 
        const data = {
            name: senderSession.user,
            message: message,
            date: new Date()
        }
        socket.broadcast.emit('chat-message', data);
    });

    

    socket.on("disconnect", () => {
        console.log("disconnected");
    });
});

server.listen(4000, () => {
    console.log("Server listening on PORT 4000");
});


