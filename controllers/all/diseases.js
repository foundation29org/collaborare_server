// functions for each call of the api on social-info. Use the social-info model

'use strict'

// add the social-info model
const Diseases = require('../../models/diseases')
const serviceAuth = require('../../services/auth')
const User = require('../../models/user');
const { decrypt } = require('../../services/crypt');
const fs = require('fs');

function getDiseases(req, res){
	Diseases.find((err, eventsdb) => {
		if (err) return res.status(500).send({message: `Error making the request: ${err}`})
		var listEventsdb = [];

		eventsdb.forEach(function(eventdb) {
			listEventsdb.push(eventdb);
		});
		res.status(200).send(listEventsdb)
	});
}

function saveDisease(req, res){
	let userId = decrypt(req.params.userId)
	let eventdb = new Diseases()
	eventdb.id = req.body.id
	eventdb.name = req.body.name
	eventdb.items = []
	eventdb.updated = Date.now()

	let jsonData = loadJsonFile()
	if (jsonData) {
		const item = findItemById(req.body.id, jsonData);
		if (item) {
			console.log('Item found:', item);
			eventdb.items = item.items;
		} else {
			console.log('Item not found for ID:', idToCheck);
		}
	} else {
		console.log('JSON data not loaded');
	}
	eventdb.save((err, eventdbStored) => {
		if (err) {
			res.status(500).send({message: `Failed to save in the database: ${err} `})
		}
		if(eventdbStored){
			User.findByIdAndUpdate(userId, {orphacode: req.body.id}, {new: true}, (err, userUpdated) => {
				if (err) return res.status(500).send({message: `Error making the request: ${err}`})
				if(userUpdated){
					return res.status(200).send({
						message: 'You have successfully logged in',
						token: serviceAuth.createToken(userUpdated),
						eventdb: eventdbStored.id
					})
				}else{
					return res.status(404).send({message: 'User not updated'})
				}
			})
		}else{
			res.status(404).send({message: 'Eventdb not saved'})
		}
	})


}

function findItemById(id, jsonData) {
    return jsonData.find(item => item.id === id);
}

function loadJsonFile() {
    try {
		var url = './models/Final_List_200.json'
		var json = JSON.parse(fs.readFileSync(url, 'utf8'));
        return json
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

function getDisease(req, res){

	let orphacode = req.params.id;
	console.log(orphacode)
	Diseases.findOne({id: orphacode}, (err,eventdb) => {
		if (err) return res.status(500).send({message: `Error making the request: ${err}`})
		if (!eventdb) return res.status(200).send({message: `The eventdb does not exist`})

		res.status(200).send({ disease: eventdb })
	})
}

function updateDisease (req, res){
	let diseaseId= req.params.id;
	let update = {
		items: req.body.items,
		updated: Date.now()
	}
	console.log(diseaseId)
	Diseases.findByIdAndUpdate(diseaseId, update, {select: '-createdBy', new: true}, (err,eventdbUpdated) => {
		if (err) return res.status(500).send({message: `Error making the request: ${err}`})
		if(eventdbUpdated){
			console.log(eventdbUpdated)
			res.status(200).send({message: 'Eventdb updated'})
		}else{
			res.status(404).send({message: 'Eventdb not updated'})
		}
	})
}

function deleteDisease (req, res){
	let diseaseId= req.body.id;
	let userId = decrypt(req.params.userId)
	Diseases.findById(diseaseId, (err,eventdb) => {
		if (err) return res.status(500).send({message: `Error making the request: ${err}`})
		if (!eventdb) return res.status(404).send({message: `The eventdb does not exist`})

		eventdb.remove(err => {
			if (err) return res.status(500).send({message: `Error making the request: ${err}`})

			User.findByIdAndUpdate(userId, {orphacode: null}, {new: true}, (err, userUpdated) => {
				if (err) return res.status(500).send({message: `Error making the request: ${err}`})
				if(userUpdated){
					return res.status(200).send({
						message: 'You have successfully logged in',
						token: serviceAuth.createToken(userUpdated),
						eventdb: null
					})
				}else{
					return res.status(404).send({message: 'User not updated'})
				}
			})
			//res.status(200).send({message: 'Eventdb deleted'})
		})
	})
}

module.exports = {
	getDisease,
	updateDisease,
	saveDisease,
	deleteDisease
}
