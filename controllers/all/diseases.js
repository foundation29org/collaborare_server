// functions for each call of the api on social-info. Use the social-info model

'use strict'

// add the social-info model
const Diseases = require('../../models/diseases')
const serviceAuth = require('../../services/auth')
const User = require('../../models/user');
const { decrypt } = require('../../services/crypt');
const fs = require('fs');
const langchain = require('../../services/langchain');

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

async function saveDisease(req, res){
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
			console.log('Item not found for ID:', req.body.id);
			console.log('Trying to generate items for:', req.body.name);
			try {
				let item_list = await langchain.generate_items_for_disease(req.body.name);
				console.log('Generated items:', item_list);
				// Convert the generated items text to an array of items
				let itemsArray = JSON.parse(item_list.text.replace(/'/g, '"'));
				eventdb.items = itemsArray;
			} catch (error) {
				console.error('Error generating items:', error);
			}
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

function searchDisease(req, res){
	let searchTerm = req.params.id.trim();

    // Validación básica de la entrada
    if (!searchTerm || searchTerm.length > 100) { // Limita la longitud de la entrada
        return res.status(400).send({ message: "Invalid search term" });
    }

    let query = {};

    // Comprobar si la búsqueda es numérica
    if (/^\d+$/.test(searchTerm)) {
        query.id = searchTerm.startsWith('ORPHA:') ? searchTerm : `ORPHA:${searchTerm}`;
    } else {
        // Utilizar una expresión regular segura
        // Evitar expresiones regulares demasiado complejas o largas
        query.name = { $regex: new RegExp(searchTerm, 'i') };
    }

    let collationConfig = {
        locale: 'es',
        strength: 1
    };

    Diseases.find(query).collation(collationConfig)
            .limit(50) // Limitar el número de resultados
            .exec((err, diseases) => {
        if (err) return res.status(500).send({ message: `Error making the request: ${err}` });
        if (!diseases || diseases.length === 0) return res.status(200).send({ message: `No matching diseases found` });

        res.status(200).send({ diseases });
    });
}

module.exports = {
	getDisease,
	updateDisease,
	saveDisease,
	deleteDisease,
	searchDisease
}
