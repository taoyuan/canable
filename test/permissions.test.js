'use strict';

/* global describe,it */
const assert = require('chai').assert;
const Permissions = require('../src/permissions');
const s = require('./support');

class Product {
	save() {
	}
}

function itPermissions(dirty) {
	let permissions;

	beforeEach(() => s.setup());

	beforeEach(() => {
		permissions = new Permissions(require('../src/models')({ds: s.ds}), {dirty});
	});

	afterEach(() => s.teardown());

	function getPermissions(target) {
		return target._permissions || target.actions;
	}

	it('should allow single action', () => {
		const product = new s.Product();
		return permissions.allow('tom', product, 'read').then(p => {
			assert.deepEqual(getPermissions(p || product), {tom: ['read']});
		});
	});

	it('should allow multiple actions', () => {
		const product = new s.Product();
		return permissions.allow('tom', product, ['read', 'destroy']).then(p => {
			assert.deepEqual(getPermissions(p || product), {tom: ['read', 'destroy']});
		});
	});

	it('should allow multiple subjects', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(p => {
			assert.deepEqual(getPermissions(p || product), {a: ['read', 'destroy'], b: ['read', 'destroy']});
		});
	});

	it('should disallow action', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			return permissions.disallow(['a', 'b'], product, ['destroy']).then(p => {
				assert.deepEqual(getPermissions(p || product), {a: ['read'], b: ['read']});
			});
		});
	});

	it('should can for all without permissions set', () => {
		const product = new s.Product();
		assert.eventually.isTrue(permissions.can('a', product, 'read'));
	});

	it('should can for all with empty permissions', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, []).then(() => {
			assert.eventually.isTrue(permissions.can('a', product, 'read'));
		});
	});

	it('should can for all with `*` action permitted', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, '*').then(() => {
			assert.eventually.isTrue(permissions.can('a', product, 'read'));
		});
	});

	it('should can for all with `all` action permitted', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, 'all').then(() => {
			assert.eventually.isTrue(permissions.can('a', product, 'read'));
		});
	});

	it('should can for single permitted action', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isTrue(permissions.can('a', product, 'read'));
		});
	});

	it('should can for multiple permitted actions', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isTrue(permissions.can('a', product, ['read', 'destroy']));
		});
	});

	it('should `can` not for single un-permitted action', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(permissions.can('a', product, ['manage']));
		});
	});

	it('should `can` not for multiple un-permitted action', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(permissions.can('a', product, ['read', 'manage']));
		});
	});

	it('should `can` not for single un-permitted subject', () => {
		const product = new s.Product();
		return permissions.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(permissions.can('c', product, ['read']));
		});
	});

	it('should work for string entity', () => {
		return permissions.allow('tom', 'Product', 'read').then(() => {
			return permissions._models.CanPermission.findOne({entityType: 'Product'}).then(inst => {
				assert.deepEqual(inst.actions, {tom: ['read']});
			});
		});
	});
}

describe('permissions', () => {
	describe('dirty', () => {
		itPermissions(true);
	});

	describe('not dirty', () => {
		itPermissions(false);
	});
});
