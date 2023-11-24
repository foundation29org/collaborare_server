// functions for each call of the api on social-info. Use the social-info model

'use strict'

// add the social-info model
const Diseases = require('../../models/diseases')

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
	let eventdb = new Diseases()
	eventdb.id = req.body.id
	eventdb.name = req.body.name
	eventdb.items = req.body.items
	eventdb.updated = Date.now()
	eventdb.save((err, eventdbStored) => {
		if (err) {
			res.status(500).send({message: `Failed to save in the database: ${err} `})
		}
		if(eventdbStored){
			res.status(200).send({message: 'Eventdb created'})
		}
	})


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

module.exports = {
	getDisease,
	updateDisease
}
