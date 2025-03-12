// functions for each call of the api on social-info. Use the social-info model

'use strict'

// add the social-info model
const Diseases = require('../../models/diseases')
const DiseasesHistory = require('../../models/diseases_history')
const serviceEmail = require('../../services/email')
const serviceAuth = require('../../services/auth')
const User = require('../../models/user');
const { decrypt, encrypt } = require('../../services/crypt');
const fs = require('fs');
const langchain = require('../../services/langchain');

function getDiseases(req, res) {
	Diseases.find((err, eventsdb) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		var listEventsdb = [];

		eventsdb.forEach(function (eventdb) {
			listEventsdb.push(eventdb);
		});
		res.status(200).send(listEventsdb)
	});
}

async function saveDisease(req, res) {
	let userId = decrypt(req.params.userId)
	//update de Disease with userId is createdBy, with the items and the name and the id and the date
	Diseases.findOne({ createdBy: userId }, async (err, eventdb) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		if (!eventdb) return res.status(200).send({ message: `The eventdb does not exist` })
		if (eventdb) {
			let jsonData = loadJsonFile()
			if (jsonData) {
				const item = findItemById(req.body.id, jsonData);
				if (item) {
					eventdb.id = item.id;
					eventdb.name = item.name;
					eventdb.updated = Date.now();
					eventdb.items = item.items;
				} else {
					try {
						let item_list = await langchain.generate_items_for_disease(req.body.name);
						
						// Check if there was an error from the langchain service
						if (item_list.status && item_list.status === 500) {
							console.error("Error generating items:", item_list.msg);
							return res.status(500).send({ 
								message: 'Error generating items', 
								error: item_list.msg,
								originalText: item_list.originalText 
							});
						}
						
						// Convert the generated items text to an array of items
						try {
							console.log("JSON original:", item_list.text);
							
							// Usar la función robusta para limpiar y corregir el JSON
							try {
								let itemsArray = cleanAndFixJSON(item_list.text);
								
								// Verificar que el resultado es un array
								if (!Array.isArray(itemsArray)) {
									console.error("Response is not an array:", itemsArray);
									return res.status(500).send({ 
										message: 'Error: Response is not an array', 
										text: item_list.text 
									});
								}
								
								// Verificar que cada elemento tiene la propiedad "name"
								const missingNameItems = itemsArray.filter(item => !item.hasOwnProperty('name'));
								if (missingNameItems.length > 0) {
									console.error("Some items are missing 'name' property:", missingNameItems);
									// Intentar corregir los elementos que faltan
									itemsArray = itemsArray.map((item, index) => {
										if (!item.hasOwnProperty('name')) {
											return { name: `Item ${index + 1}: ${JSON.stringify(item)}` };
										}
										return item;
									});
								}
								
								eventdb.items = itemsArray;
								eventdb.updated = Date.now()
								eventdb.id = req.body.id
								eventdb.name = req.body.name
								eventdb.synonyms = req.body.synonyms
							} catch (jsonError) {
								console.error("Error parsing JSON:", jsonError, "Text:", item_list.text);
								return res.status(500).send({ 
									message: 'Error parsing JSON response', 
									error: jsonError.message,
									text: item_list.text 
								});
							}
						} catch (error) {
							console.error('Error generating items:', error);
						}
					} catch (error) {
						console.error('Error generating items:', error);
					}
				}
			} else {
				console.log('JSON data not loaded');
			}
			eventdb.save((err, eventdbStored) => {
				if (err) {
					res.status(500).send({ message: `Failed to save in the database: ${err} ` })
				}
				if (eventdbStored) {
					return res.status(200).send({
						message: 'Data saved successfully'
					})
				} else {
					res.status(404).send({ message: 'Eventdb not saved' })
				}
			})
			let diseasesHistory = new DiseasesHistory()
			diseasesHistory.id = eventdb.id
			diseasesHistory.name = eventdb.name
			diseasesHistory.items = eventdb.items
			diseasesHistory.date = eventdb.date
			diseasesHistory.updated = eventdb.updated
			diseasesHistory.createdBy = eventdb.createdBy
			diseasesHistory.validatorInfo = eventdb.validatorInfo
			diseasesHistory.save()
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

function selectDisease(req, res) {

	let orphacode = req.params.id;
	Diseases.findOne({ id: orphacode }, (err, eventdb) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		if (!eventdb) return res.status(200).send({ message: `The eventdb does not exist` })

		res.status(200).send({ disease: eventdb })
	})
}

function getDisease(req, res) {
	let userId = decrypt(req.params.userId)
	Diseases.findOne({ createdBy: userId }, (err, eventdb) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		if (!eventdb) return res.status(200).send({ message: `The disease does not exist` })

		res.status(200).send({ disease: eventdb })
	})
}

function updateDisease(req, res) {
	let diseaseId = req.params.id;
	let update = {
		items: req.body.items,
		updated: Date.now()
	}
	Diseases.findByIdAndUpdate(diseaseId, update, { new: true }, (err, eventdbUpdated) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		if (eventdbUpdated) {
			let diseasesHistory = new DiseasesHistory()
			diseasesHistory.id = eventdbUpdated.id
			diseasesHistory.name = eventdbUpdated.name
			diseasesHistory.items = eventdbUpdated.items
			diseasesHistory.date = eventdbUpdated.date
			diseasesHistory.updated = eventdbUpdated.updated
			diseasesHistory.createdBy = eventdbUpdated.createdBy
			diseasesHistory.validatorInfo = eventdbUpdated.validatorInfo
			diseasesHistory.save()
			res.status(200).send({ message: 'Eventdb updated' })
		} else {
			res.status(404).send({ message: 'Eventdb not updated' })
		}
	})
}

function deleteDisease(req, res) {
	let diseaseId = req.body.id;
	let userId = decrypt(req.params.userId)
	Diseases.findById(diseaseId, (err, eventdb) => {
		if (err) return res.status(500).send({ message: `Error making the request: ${err}` })
		if (!eventdb) return res.status(404).send({ message: `The eventdb does not exist` })
		//delete items, name, id, date and updated
		eventdb.items = []
		eventdb.name = ''
		eventdb.id = ''
		eventdb.updated = Date.now()
		eventdb.save((err, eventdbStored) => {
			if (err) {
				res.status(500).send({ message: `Failed to save in the database: ${err} ` })
			}
			if (eventdbStored) {
				return res.status(200).send({
					message: 'Deleted disease successfully'
				})
			} else {
				res.status(404).send({ message: 'Eventdb not saved' })
			}
		})
	})

	//delete all from DiseasesHistory if created by userId
	DiseasesHistory.deleteMany({ createdBy: userId }, (err, eventdb) => {
		
	})
}

function searchDisease(req, res) {
	let searchTerm = req.params.id.trim();

	// Validación básica de la entrada
	if (!searchTerm || searchTerm.length > 100) { // Limita la longitud de la entrada
		return res.status(400).send({ message: "Invalid search term" });
	}

	let query = {};

	// Comprobar si la búsqueda es numérica
	if (/^\d+$/.test(searchTerm) || searchTerm.startsWith('ORPHA:')) {
		query.id = searchTerm.startsWith('ORPHA:') ? searchTerm : `ORPHA:${searchTerm}`;
	} else {
		// Utilizar una expresión regular segura
		// Evitar expresiones regulares demasiado complejas o largas
		//query.name = { $regex: new RegExp(searchTerm, 'i') };
		const searchRegex = new RegExp(searchTerm, 'i');
		query.$or = [
			{ name: searchRegex },
			{ synonyms: searchRegex }
		];
	}

	let collationConfig = {
		locale: 'es',
		strength: 1
	};

	Diseases.find(query).collation(collationConfig)
		.select('-_id')
		.limit(50) // Limitar el número de resultados
		.exec((err, diseases) => {
			if (err) return res.status(500).send({ message: `Error making the request: ${err}` });
			if (!diseases || diseases.length === 0) return res.status(200).send({ message: `No matching diseases found` });

			// Iterar sobre cada enfermedad y añadir el userId cifrado
			const modifiedDiseases = diseases.map(disease => {
				// Asegúrate de que la enfermedad es un objeto plano para modificarlo
				const diseaseObj = disease.toObject();
				// Cifrar createdBy y asignarlo a userId
				let userId = diseaseObj.createdBy.toString();
				diseaseObj.userId = encrypt(userId);
				
				// Eliminar createdBy para no enviarlo en la respuesta
				delete diseaseObj.validatorInfo.contactEmail;
				delete diseaseObj.validatorInfo.acceptTerms;
				delete diseaseObj.validatorInfo._id;
				delete diseaseObj.createdBy;
				return diseaseObj;
			});

			res.status(200).send({ diseases: modifiedDiseases });
		});
}

function validatedDiseases(req, res) {

	let collationConfig = {
		locale: 'es',
		strength: 1
	};

	Diseases.find({}).collation(collationConfig)
		.select('-_id')
		.limit(50) // Limitar el número de resultados
		.exec((err, diseases) => {
			if (err) return res.status(500).send({ message: `Error making the request: ${err}` });
			if (!diseases || diseases.length === 0) return res.status(200).send({ message: `No matching diseases found` });

			// Iterar sobre cada enfermedad y añadir el userId cifrado
			const modifiedDiseases = diseases.map(disease => {
				// Asegúrate de que la enfermedad es un objeto plano para modificarlo
				const diseaseObj = disease.toObject();
				// Cifrar createdBy y asignarlo a userId
				let userId = diseaseObj.createdBy.toString();
				diseaseObj.userId = encrypt(userId);
				// Eliminar createdBy para no enviarlo en la respuesta
				delete diseaseObj.validatorInfo.contactEmail;
				delete diseaseObj.validatorInfo.acceptTerms;
				delete diseaseObj.validatorInfo._id;
				delete diseaseObj.createdBy;
				return diseaseObj;
			});

			res.status(200).send({ diseases: modifiedDiseases });
		});
}

async function previewDisease(req, res) {
	let jsonData = loadJsonFile()
	let eventdb = new Diseases()
	if (jsonData) {
		const item = findItemById(req.body.id, jsonData);
		if (item) {
			eventdb.id = item.id;
			eventdb.name = item.name;
			eventdb.updated = Date.now();
			eventdb.items = item.items;
			return res.status(200).send({ disease: eventdb })
		} else {
			try {
				let item_list = await langchain.generate_items_for_disease(req.body.name);
				
				// Check if there was an error from the langchain service
				if (item_list.status && item_list.status === 500) {
					console.error("Error generating items:", item_list.msg);
					return res.status(500).send({ 
						message: 'Error generating items', 
						error: item_list.msg,
						originalText: item_list.originalText 
					});
				}
				
				// Convert the generated items text to an array of items
				try {
					console.log("JSON original:", item_list.text);
					
					// Usar la función robusta para limpiar y corregir el JSON
					try {
						let itemsArray = cleanAndFixJSON(item_list.text);
						
						// Verificar que el resultado es un array
						if (!Array.isArray(itemsArray)) {
							console.error("Response is not an array:", itemsArray);
							return res.status(500).send({ 
								message: 'Error: Response is not an array', 
								text: item_list.text 
							});
						}
						
						// Verificar que cada elemento tiene la propiedad "name"
						const missingNameItems = itemsArray.filter(item => !item.hasOwnProperty('name'));
						if (missingNameItems.length > 0) {
							console.error("Some items are missing 'name' property:", missingNameItems);
							// Intentar corregir los elementos que faltan
							itemsArray = itemsArray.map((item, index) => {
								if (!item.hasOwnProperty('name')) {
									return { name: `Item ${index + 1}: ${JSON.stringify(item)}` };
								}
								return item;
							});
						}
						
						eventdb.items = itemsArray;
						eventdb.updated = Date.now()
						eventdb.id = req.body.id
						eventdb.name = req.body.name
						eventdb.synonyms = req.body.synonyms
					} catch (jsonError) {
						console.error("Error parsing JSON:", jsonError, "Text:", item_list.text);
						return res.status(500).send({ 
							message: 'Error parsing JSON response', 
							error: jsonError.message,
							text: item_list.text 
						});
					}
				} catch (error) {
					console.error('Error generating items:', error);
				}
				return res.status(200).send({ disease: eventdb })
			} catch (error) {
				console.error('Error generating items:', error);
				return res.status(500).send({ message: 'Error generating items' });
			}
		}
	} else {
		console.log('JSON data not loaded');
		return res.status(500).send({ message: 'JSON data not loaded' });
	}
}

function shareDisease(req, res) {
	let requestInfo = req.body
	serviceEmail.sendMailShareDisease(requestInfo)
		.then(response => {
			return res.status(200).send({ message: 'Email sent'})
		})
		.catch(response => {
			insights.error(response);
			res.status(500).send({ message: 'Fail sending email'})
		})
}

// Función para limpiar y corregir el JSON
function cleanAndFixJSON(jsonText) {
	try {
		// Método 1: Intentar analizar directamente
		return JSON.parse(jsonText);
	} catch (error) {
		console.log("Método 1 falló, intentando método 2");
		try {
			// Método 2: Reemplazar apóstrofes y luego analizar
			const cleaned = jsonText
				.replace(/(\w)'(\w)/g, '$1\\\'$2') // Escapar apóstrofes dentro de palabras
				.replace(/'/g, '"') // Reemplazar comillas simples por dobles
				.replace(/\s+/g, ' ') // Normalizar espacios en blanco
				.trim();
			return JSON.parse(cleaned);
		} catch (error) {
			console.log("Método 2 falló, intentando método 3");
			try {
				// Método 3: Usar una expresión regular para extraer los valores de "name"
				const nameRegex = /"name"\s*:\s*"([^"]*)"/g;
				const matches = [...jsonText.matchAll(nameRegex)];
				if (matches.length > 0) {
					return matches.map(match => ({ name: match[1] }));
				}
				throw new Error("No se encontraron coincidencias de 'name'");
			} catch (error) {
				console.log("Método 3 falló, intentando método 4");
				try {
					// Método 4: Enfoque más agresivo, eliminar caracteres problemáticos
					const aggressive = jsonText
						.replace(/[^\x20-\x7E]/g, '') // Eliminar caracteres no ASCII
						.replace(/'/g, '"')
						.replace(/\\/g, '\\\\') // Escapar barras invertidas
						.replace(/(\w)"(\w)/g, '$1\\"$2') // Escapar comillas dentro de palabras
						.replace(/([^\\])"/g, '$1\\"') // Escapar comillas no escapadas
						.replace(/^[^[]*\[/g, '[') // Eliminar todo antes del primer '['
						.replace(/\][^]]*$/g, ']') // Eliminar todo después del último ']'
						.trim();
					
					// Reconstruir el JSON manualmente
					const items = aggressive.split('},{').map(item => {
						const nameMatch = item.match(/"name"\s*:\s*"([^"]*)"/);
						return nameMatch ? { name: nameMatch[1].replace(/\\"/g, '"') } : null;
					}).filter(Boolean);
					
					if (items.length === 0) throw new Error("No se pudieron extraer elementos");
					return items;
				} catch (error) {
					console.log("Todos los métodos fallaron");
					throw new Error("No se pudo analizar el JSON después de múltiples intentos");
				}
			}
		}
	}
}

module.exports = {
	selectDisease,
	getDisease,
	updateDisease,
	saveDisease,
	deleteDisease,
	searchDisease,
	validatedDiseases,
	previewDisease,
	shareDisease
}
