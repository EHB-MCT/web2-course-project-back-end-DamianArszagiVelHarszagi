const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

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
let reviewsCollection = "";

async function start() {
	try {
		await client.connect();
		await client.db("admin").command({ ping: 1 });
		console.log("mongoDB connected");

		database = client.db("calisthenics");
		parksCollection = database.collection("parks");
		reviewsCollection = database.collection("reviews");
		/*
		app.get("/", (req, res) => res.send("server ok + DB connected"));

		app.get("/api/test", (req, res) => {
			res.json({ ok: true });
		});

		*/
		app.get("/api/parks", async (req, res) => {
			try {
				const parks = await parksCollection.find().toArray(); //later filter maken
				res.json(parks);
			} catch (error) {
				res.status(500).json({ message: "error loading parks" });
			}
		});
		app.get("/api/reviews", async (req, res) => {
			const parkId = req.query.parkId;

			if (!parkId) return res.status(400).send("park missing");
			if (!ObjectId.isValid(parkId))
				return res.status(400).send(`${parkId} form not correct`);

			const reviews = await reviewsCollection
				.find({ parkId: new ObjectId(parkId) })
				.toArray();

			res.json(reviews);
		});
		app.post("/api/parks", async (req, res) => {
			try {
				const { name, city, rating, open24_7, equipment } = req.body;

				if (!name || !city) {
					return res.status(400).json({ message: "name and city required" });
				}
				let r = Number(rating) || 0;

				let eq = [];
				if (Array.isArray(equipment)) {
					eq = equipment;
				} else if (typeof equipment === "string") {
					eq = equipment
						.split(",")
						.map((x) => x.trim())
						.filter((x) => x.length > 0);
				}

				const park = {
					name,
					city,
					rating: r,
					open24_7: Boolean(open24_7),
					equipment: eq,
					reviewsCount: 0,
					createdAt: new Date(),
				};
				const result = await parksCollection.insertOne(park);

				res.status(201).json({
					message: "Park added",
					id: result.insertedId,
					data: park,
				});
			} catch (error) {
				console.error("POST /api/parks ERROR:", error);
				res.status(500).json({ message: error.message });
			}
		});
		app.post("/api/reviews", async (req, res) => {
			try {
				const { parkId, rating, comment } = req.body;

				if (!parkId)
					return res.status(400).json({ message: "parkId is required" });
				if (!ObjectId.isValid(parkId))
					return res.status(400).json({ message: "form not correct" });

				let r = Number(rating) || 0;
				if (r < 0) r = 0;
				if (r > 5) r = 5;

				const parkObjectId = new ObjectId(parkId);

				const park = await parksCollection.findOne({ _id: parkObjectId });
				if (!park) return res.status(400).json({ message: "park not found" });

				const review = {
					parkId: new ObjectId(parkId),
					rating: r,
					comment: comment || "",
					createdAt: new Date(),
				};
				await reviewsCollection.insertOne(review);

				//park rating en reviewsCount updaten
				const oldCount = Number(park.reviewsCount) || 0;
				const oldRating = Number(park.rating) || 0;

				const newCount = oldCount + 1;
				const newAvg = (oldRating * oldCount + r) / newCount;

				await parksCollection.updateOne(
					{ _id: parkObjectId },
					{ $set: { rating: newAvg, reviewsCount: newCount } }
				);
				//updated park terugsturen
				const updatedPark = await parksCollection.findOne({
					_id: parkObjectId,
				});
				res.status(201).json(updatedPark);
			} catch (error) {
				res.status(500).json({ message: "error adding reviews" });
			}
		});
		app.listen(port, () => console.log(`http://localhost:${port}`));
	} catch (error) {
		console.error("mongodb niet connected", error.message);
	}
}
start();
