const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

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
    // Connect the client to the server
    await client.connect();

    const userCollection = client.db("usersDB").collection("users");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const { email } = user;
      try {
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }
        const result = await userCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await userCollection.findOne({ email });

      if (user && user.password === password) {
        if (user.status === "blocked") {
          return res.status(403).send({ message: "User is blocked" });
        }
        await userCollection.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        );
        res.send({
          message: "Login successful",
          user: { name: user.name, email: user.email, id: user._id },
        });
      } else {
        res.status(401).send({ message: "Invalid email or password" });
      }
    });

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/users/block", async (req, res) => {
      const { userIds } = req.body;
      try {
        const result = await userCollection.updateMany(
          { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
          { $set: { status: "blocked" } }
        );
        res.send({ message: "Users blocked successfully", result });
      } catch (error) {
        console.error("Error blocking users:", error);
        res.status(500).send({ message: "Failed to block users" });
      }
    });

    app.post("/users/unblock", async (req, res) => {
      const { userIds } = req.body;
      try {
        const result = await userCollection.updateMany(
          { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
          { $set: { status: "active" } }
        );
        res.send({ message: "Users unblocked successfully", result });
      } catch (error) {
        console.error("Error unblocking users:", error);
        res.status(500).send({ message: "Failed to unblock users" });
      }
    });

    app.post("/users/delete", async (req, res) => {
      const { userIds } = req.body;
      try {
        const result = await userCollection.deleteMany({
          _id: { $in: userIds.map((id) => new ObjectId(id)) },
        });
        res.send({ message: "Users deleted successfully", result });
      } catch (error) {
        console.error("Error deleting users:", error);
        res.status(500).send({ message: "Failed to delete users" });
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    // Ensure that the client will close when you finish/error
    // You might want to comment this out if you want to keep the connection open
    // await client.close();
  }
}
run();
app.get("/", (req, res) => {
  res.send("Server is running");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
