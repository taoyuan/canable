'use strict';

/* global describe,it */
const assert = require('chai').assert;
const loadModels = require('../src/models');

describe('models', () => {
	it('should load models', () => {
		const models = loadModels();
		assert.ok(models.CanEntity);
		return models.CanEntity.create().then(p => assert.ok(p));
	});
});
