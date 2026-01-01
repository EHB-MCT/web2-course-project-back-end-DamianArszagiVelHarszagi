const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
require("dotenv").config();

const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

let database = "";
let parksCollection = "";

async function start() {
	try {
		await client.connect();
		await client.db("admin").command({ ping: 1 });
		console.log("mongoDB connected");

		database = client.db("calisthenics");
		parksCollection = database.collection("parks");

		app.get("/", (req, res) => res.send("server ok + DB connected"));

		app.get("/api/test", (req, res) => {
			res.json({ ok: true });
		});
		app.get("/api/parks", async (req, res) => {
			try {
				const parks = await parksCollection.find().toArray(); //later filter maken
				res.json(parks);
			} catch (error) {
				res.status(500).json({ message: "error loading parks" });
			}
		});
		app.listen(port, () => console.log(`http://localhost:${port}`));
	} catch (error) {
		console.error("mongodb niet connected", error.message);
	}
}
start();
