const express = require("express");
const app = express();
const { MongoCLient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
import cors from "cors";
import { version } from "react";

app.use(cors());

const client = new MongoClient("forgot_to_make", {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
let db;

async function connectionDB() {
	if (!db) {
		await client.connect();
		db = client.db(USERNAME);
		console.log("mongo connected");
	}
	return db;
}

function getDB() {
	if (!db) throw new Error("mongo not connected");
	return db;
}

module.exports = { connectionDB, getDB };
