// functions for each call of the api on user. Use the user model

'use strict'

// add the user model
const User = require('../../models/user')
const Support = require('../../models/support')
const serviceEmail = require('../../services/email')
const crypt = require('../../services/crypt')
const insights = require('../../services/insights')


function sendMsgSupport(req, res) {
	let userId = crypt.decrypt(req.body.userId);

	User.findOne({ '_id': userId }, function (err, user) {
		if (err) {
			insights.error(err);
			return res.status(500).send({ message: 'Error searching the user' })
		}
		if (user) {

			let support = new Support()
			support.type = req.body.type
			support.subject = req.body.subject
			support.description = req.body.description
			support.createdBy = userId
			support.save((err, supportStored) => {
				if (err) {
					insights.error(err);
					return res.status(500).send({ message: 'Error saving the msg' })
				}
				serviceEmail.sendMailSupport(user.email, support)
					.then(response => {
						return res.status(200).send({ message: 'Email sent' })
					})
					.catch(response => {
						insights.error(response);
						res.status(500).send({ message: 'Fail sending email' })
					})
			})


		} else {
			return res.status(500).send({ message: 'user not exists' })
		}
	})
}

function sendMsgLogoutSupport(req, res) {
	let support = new Support()
	//support.type = 'Home form'
	support.subject = 'Collaborare support'
	support.description = 'Name: ' + req.body.userName + ', Email: ' + req.body.email + ', Description: ' + req.body.description
	support.createdBy = "5c77d0492f45d6006c142ab3";
	//enviamos Email
	serviceEmail.sendMailSupport(req.body.email, 'en', support)
		.then(response => {
			return res.status(200).send({ message: 'Email sent' })
		})
		.catch(response => {
			insights.error(response);
			res.status(500).send({ message: 'Fail sending email' })
		})
}

function getUserMsgs(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	Support.find({ "createdBy": userId }, (err, msgs) => {

		if (err){
			insights.error(err);
			return res.status(500).send({ message: `Error making the request: ${err}` })
		}

		var listmsgs = [];

		msgs.forEach(function (u) {
			if (u.platform == 'Collaborare' || u.platform == undefined) {
				listmsgs.push({ subject: u.subject, description: u.description, date: u.date, status: u.status, type: u.type });
			}
		});

		//res.status(200).send({patient, patient})
		// if the two objects are the same, the previous line can be set as follows
		res.status(200).send({ listmsgs })
	})
}



module.exports = {
	sendMsgSupport,
	sendMsgLogoutSupport,
	getUserMsgs
}
