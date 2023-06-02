const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_password}@cluster0.fbfgu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const usersCollection = client.db("westDB").collection("users");
    const menuCollection = client.db("westDB").collection("menu");

    const reviewCollection = client.db("westDB").collection("reviews");
    const cartCollection = client.db("westDB").collection("carts");


    //users related apis
    app.post('/users', async(req, res) => {
      const user = req.body;
      console.log(user);
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      console.log('Existing user', existingUser);
      if(existingUser) {
        return res.send({message:'User already exists!'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

   //cart collections
   app.get('/carts', async(req, res)=>{
    const email = req.query.email;
    console.log(email)
    if (!email){
      res.send ([])
    }
    const query = {email: email}
    const result = await cartCollection.find(query).toArray();
    res.send(result)
   })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);
      const results = await cartCollection.insertOne(item)
      res.send(results);
    })

    app.get('/menu', async (req, res) => {
      const result =await menuCollection.find().toArray();
      res.send(result);
    })


    app.get('/review', async (req, res) => {
      const result =await reviewCollection.find().toArray();
      res.send(result);
    })

    //delete item
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);

    })

    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
