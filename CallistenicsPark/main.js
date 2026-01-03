const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");

require("dotenv").config();

const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//uit env.
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

//connectie met mongoDB
async function start() {
	try {
		await client.connect();
		await client.db("admin").command({ ping: 1 });
		console.log("mongoDB connected");

		// database "calisthenics"
		database = client.db("calisthenics");
		// nieuwe collections aanmaken
		parksCollection = database.collection("parks");
		reviewsCollection = database.collection("reviews");
		/*
		// kleine check ins als het werkt
		app.get("/", (req, res) => res.send("server ok + DB connected"));

		app.get("/api/test", (req, res) => {
			res.json({ ok: true });
		});
		*/
		// ------------------- GET /api/parks -------------------

		// alle parken uit park collection
		app.get("/api/parks", async (req, res) => {
			try {
				const parks = await parksCollection.find().toArray();
				res.json(parks);
			} catch (error) {
				res.status(500).json({ message: "error loading parks" });
			}
		});

		// ------------------- GET /api/reviews?parkId=... -------------------

		// alle reviews op basis van id
		app.get("/api/reviews", async (req, res) => {
			const parkId = req.query.parkId;

			// park moet degelijk bestaan
			if (!parkId) return res.status(400).send("park missing");

			//parkId correcte Mongo ObjectId string
			if (!ObjectId.isValid(parkId))
				return res.status(400).send(`${parkId} form not correct`);

			// reviews die bij park horen
			const reviews = await reviewsCollection
				.find({ parkId: new ObjectId(parkId) })
				.toArray();

			res.json(reviews);
		});

		// ------------------- POST /api/parks -------------------

		// Maakt een nieuw park aan
		app.post("/api/parks", async (req, res) => {
			try {
				// front end stuurt dit
				const { name, city, rating, open24_7, equipment } = req.body;

				if (!name || !city) {
					return res.status(400).json({ message: "name and city required" });
				}
				let r = Number(rating) || 0;

				// als het al een array is dan ok
				// als het een string is dan splits op comma en trim
				let eq = [];
				if (Array.isArray(equipment)) {
					eq = equipment;
				} else if (typeof equipment === "string") {
					eq = equipment
						.split(",")
						.map((x) => x.trim())
						.filter((x) => x.length > 0);
				}

				// park object dat in Mongo komt
				const park = {
					name,
					city,
					rating: r,
					open24_7: Boolean(open24_7),
					equipment: eq,
					reviewsCount: 0,
					createdAt: new Date(),
				};
				// invoegen
				const result = await parksCollection.insertOne(park);

				res.status(201).json({
					message: "Park added",
					id: result.insertedId,
					data: park,
				});
			} catch (error) {
				// kleine error gehad daarom debugging op error
				console.error("POST /api/parks ERROR:", error);
				res.status(500).json({ message: error.message });
			}
		});

		// ------------------- POST /api/reviews -------------------

		// voegt review aan park
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

				// check of park wel bestaat
				const park = await parksCollection.findOne({ _id: parkObjectId });
				if (!park) return res.status(400).json({ message: "park not found" });

				// review object
				const review = {
					parkId: new ObjectId(parkId), // verwijst naar park
					rating: r,
					comment: comment || "",
					createdAt: new Date(),
				};
				// invoegen review
				await reviewsCollection.insertOne(review);

				// update park stats
				const oldCount = Number(park.reviewsCount) || 0;
				const oldRating = Number(park.rating) || 0;

				// nieuwe count en nieuwe gemiddelde rating berekenen
				const newCount = oldCount + 1;
				const newAvg = (oldRating * oldCount + r) / newCount;

				// update park document in MongoDB
				await parksCollection.updateOne(
					{ _id: parkObjectId },
					{ $set: { rating: newAvg, reviewsCount: newCount } }
				);
				// haal het updated park terug op om naar frontend te sturen
				const updatedPark = await parksCollection.findOne({
					_id: parkObjectId,
				});
				res.status(201).json(updatedPark);
			} catch (error) {
				res.status(500).json({ message: "error adding reviews" });
			}
		});
		// start express server pas als database connected is
		app.listen(port, () => {
			console.log(`Server running on port ${port}`);
			// probleempjes gehad bij hoisting daarom debug
			console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

			console.log(
				"MONGO_URI starts with:",
				(process.env.MONGO_URI || "").slice(0, 12)
			);
		});
	} catch (error) {
		console.error("mongodb niet connected", error.message);
	}
}
// server start
start();
