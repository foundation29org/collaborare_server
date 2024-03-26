// functions for each call of the api on user. Use the user model

'use strict'

// add the user model
const User = require('../../models/user')
const serviceAuth = require('../../services/auth')
const serviceEmail = require('../../services/email')
const crypt = require('../../services/crypt')
const bcrypt = require('bcrypt-nodejs')
const insights = require('../../services/insights')

function login(req, res) {
	// attempt to authenticate user
	req.body.email = (req.body.email).toLowerCase();
	User.getAuthenticated(req.body.email, function (err, user, reason) {
		if (err) return res.status(500).send({ message: err })
		let randomstring = Math.random().toString(36).slice(-12);
		let dateTimeLogin = Date.now();
		if (!user) {
			console.log('no user')
			let user = new User()
			user.email = req.body.email
			user.confirmationCode = randomstring
			user.dateTimeLogin = dateTimeLogin
			user.save((err, userStored) => {
				if (err) {
					insights.error(err);
					return res.status(500).send({ message: `Error creating the user: ${err}` })
				}
				if (userStored) {
					//send email
					serviceEmail.sendEmailLogin(userStored.email, userStored.confirmationCode)
					return res.status(200).send({
						message: 'Check email'
					})
				} else {
					insights.error("The user does not exist");
					return res.status(404).send({ code: 208, message: `The user does not exist` })
				}
			})
			//return res.status(500).send({ message: `Fail` })
			
		} else {
			User.findOne({ 'email': req.body.email }, function (err, user2) {
				if (err){
					insights.error(err);
					return res.status(500).send({ message: `Error creating the user: ${err}` })
				}
				if (!user2) {
					return res.status(500).send({ message: `Fail` })
				} else {
					User.findByIdAndUpdate(user2._id, { confirmationCode: randomstring, dateTimeLogin: dateTimeLogin }, { new: true }, (err, userUpdated) => {
						if (err){
							insights.error(err);
							return res.status(500).send({ message: `Error making the request: ${err}` })
						}else{
							if(userUpdated){
								//send email
								serviceEmail.sendEmailLogin(userUpdated.email, userUpdated.confirmationCode)
								return res.status(200).send({
									message: 'Check email'
								})
							}else{
								insights.error("The user does not exist");
								return res.status(404).send({ code: 208, message: `The user does not exist` })
							}
							
						}
						
					})
				}
			})
		}

	})
}
function checkLogin(req, res) {
	User.findOne({ 'email': req.body.email, 'confirmationCode': req.body.confirmationCode }, function (err, user2) {
		if (err){
			insights.error(err);
			return res.status(500).send({ message: `Error creating the user: ${err}` })
		}
		if (!user2) {
			return res.status(500).send({ message: `Fail` })
		} else {
			var limittime = new Date(); // just for example, can be any other time
			var myTimeSpan = 5*60*1000; // 5 minutes in milliseconds
			limittime.setTime(limittime.getTime() - myTimeSpan);
			if(limittime.getTime() < user2.dateTimeLogin.getTime()){
				return res.status(200).send({
					message: 'You have successfully logged in',
					token: serviceAuth.createToken(user2)
				})
			}else{
				return res.status(200).send({
					message: 'Link expired'
				})
			}
		}
	})
}

module.exports = {
	login,
	checkLogin
}
