const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const uri =
	"mongodb+srv://damian_arszagi:<db_password>@cluster0.zle6rw4.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
const app = express();
const port = 3000;

app.use(express.json()), app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
	let message = "";
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
		message = "Hello World";
	} catch (error) {
		console.error("error", error);
		res.status(500).send("failed connect");
	} finally {
		// Ensures that the client will close when you finish/error
		await client.close();
		res.send(message);
	}
});
app.listen(port, () => console.log(`Server: http://localhost:${port}`));
