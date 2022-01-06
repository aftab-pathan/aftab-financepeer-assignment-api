const express = require("express");
const path = require("path");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());
const dbPath = path.join(__dirname, "FinancepeerData.db");

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(process.env.PORT || 3000, () => {
      console.log("Server Working At http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//AuthenticationJWT middleWare
const AuthenticationJWT = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader === undefined) {
    response.status(401);
    response.send({ error_msg: "Invalid JWT Token" });
  } else {
    jwtToken = authHeader.split(" ")[1];
  }
  jwt.verify(jwtToken, "SECRET", (error, payload) => {
    if (error) {
      response.status(401);
      response.send({ error_msg: "Invalid JWT Token" });
    } else {
      request.username = payload.username;
      next();
    }
  });
};

//API 1 register
app.post("/register/", async (request, response) => {
  const { username, password, name } = request.body;
  const checkUserQuery = `
  SELECT * FROM user WHERE username = '${username}';`;
  const checkUser = await db.get(checkUserQuery);
  if (checkUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send({ error_msg: "Password is too short" });
    } else {
      const hashPass = await bcrypt.hash(password, 10);
      const createUserQuery = `
        INSERT INTO user(name,username,password)
        VALUES ('${name}','${username}','${hashPass}');`;
      await db.run(createUserQuery);
      response.status(200);
      response.send({ success_msg: "User created successfully" });
    }
  } else {
    response.status(400);
    response.send({ error_msg: "User already exists" });
  }
});

//API 2 login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
  SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(getUserQuery);
  if (userDetails === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid user" });
  } else {
    const isPassCorrect = await bcrypt.compare(password, userDetails.password);
    if (isPassCorrect === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET");
      response.status(200);
      response.send({ jwt_token: jwtToken });
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid password" });
    }
  }
});

//API 3 GET post data
app.get("/", AuthenticationJWT, async (request, response) => {
  const getPostQuery = `
  SELECT * FROM postData`;
  const userPost = await db.all(getPostQuery);
  response.status(200);
  response.send(
    userPost.map((each) => ({
      userId: each.user_id,
      title: each.title,
      body: each.body,
    }))
  );
});

//API 4 InsertData in dB
app.post("/posts/add/", AuthenticationJWT, async (request, response) => {
  const { postData } = request.body;

  const values = postDetails.map(
    (eachPost) => `('${eachPost.userId}', ${eachPost.title}, ${eachPost.body})`
  );

  const valuesString = values.join(",");

  const addPostQuery = `
    INSERT INTO
      postData (user_id,title,body)
    VALUES
       ${valuesString};`;

  const dbResponse = await db.run(addPostQuery);
  const postId = dbResponse.lastID;
  response.status(200);
  response.send({ success_msg: "Post added successfully" });
});
