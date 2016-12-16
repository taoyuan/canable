'use strict';

exports.hideProperty = hideProperty;
function hideProperty(Model, property) {
	const settings = Model.definition && Model.definition.settings;

	settings.hidden = settings.hidden || [];
	settings.hidden.push(property);

	if (settings.hiddenProperties) {
		settings.hiddenProperties[property] = true;
	}
}
