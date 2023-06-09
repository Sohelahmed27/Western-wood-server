const express = require("express");
require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const cors = require("cors");
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

//Send email conformation
const sendPaymentConformationEmail = payment => {


}

const verifyJWT =(req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    res.status(401).send({error:true, message:'Unauthorized access'})
  }

//bearer token
const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_token_SECRET, (err, decoded)=>{
    if(err){
      res.status(401).send({error:true, message:'Unauthorized access'})
    }
    req.decoded = decoded;
    next();
  });
}

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

 

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
    const paymentCollection = client.db("westDB").collection("payments");
    
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

   app.patch('/users/admin/:id', async(req, res) => {
     const id = req.params.id;
     const filter = {_id: new ObjectId(id)}
     const updateDoc = {
      $set: {
        role:'admin'
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);

   })

    //users related apis
    app.get('/users', verifyJWT, verifyAdmin, async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async(req, res) => {
      const user = req.body;
    
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      
      if(existingUser) {
        return res.send({message:'User already exists!'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    //jwt apis

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_token_SECRET, { expiresIn: '1h' })
      res.send({token})

    })


    app.get('/user/admin/:email',  verifyJWT,  async(req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email) {
        res.send({admin: false})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const result ={admin: user?.role === 'admin'}
      res.send(result)
    })



   //cart collections
 
  app.get('/carts',verifyJWT, async (req, res) => {
    const email = req.query.email;
  console.log(req.decoded)
    if (!email) {
     return  res.send([]);
    }

    const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
      return res.status(403).send({ error: true, message: 'forbidden access' })
    }

    const query = { email: email };
    const result = await cartCollection.find(query).toArray();
    res.send(result);
  });


 

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

    //send image
    app.post('/menu', verifyJWT, verifyAdmin, async(req, res) => {
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    })

    // delete menu item api

    app.delete('/menu/:id', verifyJWT, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result);
    })

    //delete item
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

   //payment related api

 

      // create payment intent
      app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        const { price } = req.body;
        
        const amount = parseInt(price * 100);
        console.log(price, amount);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
      currency: 'inr',
      payment_method_types: ['card'],
      metadata: {
        customer_name: 'customerName',
        customer_email: 'customerEmail',
      },
      shipping: {
        name: "customerName",
        address: {
          line1: 'Street Address',
          city: 'City',
          state: 'State',
          postal_code: 'Postal Code',
          country: 'IN',
        },
      },
        });
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })

      app.post('/payment', async (req, res)=> {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
    
        const query = { _id: {$in:payment.cartItems.map(id=> new ObjectId(id))}}
        const deleteResult = await cartCollection.deleteMany(query);
    
        console.log(payment)
        res.send({insertResult, deleteResult})
       })

      app.post('/payments', verifyJWT, async (req, res) => {
        const payment = req.body;
        const result = await paymentCollection.insertOne(payment);
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
