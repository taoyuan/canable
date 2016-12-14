const joi = require('joi');

const Entity = joi.object({
	save: joi.func().optional()
}).unknown();
exports.Entity = Entity;

const Entities = joi.alternatives().try(Entity, joi.array().items(Entity));
exports.Entities = Entities;

const Subject = joi.string();
exports.Subject = Subject;
const Subjects = joi.alternatives().try(Subject, joi.array().items(Subject));
exports.Subjects = Subjects;

const Action = joi.string();
exports.Action = Action;
const Actions = joi.alternatives().try(Subject, joi.array().items(Action));
exports.Actions = Actions;
