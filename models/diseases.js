// eventsdb schema
'use strict'

const mongoose = require ('mongoose');
const Schema = mongoose.Schema

const { conndbaccounts } = require('../db_connect')

const DiseasesSchema = Schema({
	id: { type: String, required: true},
	name: { type: String, required: true},
	items: {type: Object, default: []},
	date: {type: Date, default: Date.now},
	updated: {type: Date, default: Date.now}
})

module.exports = conndbaccounts.model('Diseases',DiseasesSchema)
// we need to export the model so that it is accessible in the rest of the app
