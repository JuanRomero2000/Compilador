function Value(type,value){
	assert(type==="numero"||type==="string"||type==="array","tipo no valido al crear valor");
	this.type=type;
	if(value===undefined)
		this.value=defaultValue(type);
	else{
		this.value=value;
	}
}

Value.prototype.copy=function(){ // Copia mas profunda
	if(this.type==="array"){
		var copy=[];
		for(var i=0;i<this.value.length;i++)
			copy.push(this.value[i].copy());
		return new Value(this.type,copy);
	}
	return new Value(this.type,this.value);
};

Value.prototype.set=function(value,dynamic){
	if(dynamic)
		this.type=value.type;
	else
		value.expect(this.type);
	this.value=value.value;
};

Value.prototype.isIn=function(list){
	for(var i=0;i<list.length;i++)
		if(compare(this,list[i]))
			return true;
}

Value.prototype.toString=function(base){
	switch(this.type){
		case "numero":
			return this.value.toString(base).toUpperCase();
		case "string":
			return this.value;
		case "array":
			return "["+this.value.join(",")+"]";
		default:
			assert(false,"invalid type");
	}
};

Value.prototype.truthy=function(){
	switch(this.type){
		case "numero":
			return this.value!==0;
		case "string":
			return this.value!=="";
		case "array":
			return this.value.length!==0;
		default:
			assert(false,"invalid type");
	}
};

Value.prototype.expect=function(type,message){
	assert(this.type===type,message || "Type falta de coincidencia. Esperando "+type+", got "+this.type+" en su lugar.");
};

function defaultValue(type){
	switch(type){
		case "numero":
			return 0;
		case "string":
			return "";
		case "array":
			return [];
		default:
			assert(false," Tipo invalido ");
	}
}

function compare(a,b){
	if(a.type!==b.type)
		return false;
	switch(a.type){
		case "numero":case "string":
			return a.value===b.value;
		break;case "array":
			if(a.value.length!=b.value.length)
				return false;
			for(var i=0;i<a.value.length;i++)
				if(!compare(a.value[i],b.value[i]))
					return false;
			return true;
	}
}

function typeFromName(name){
	assert(name.constructor===String,"error interno: sin nombre de variable");
	switch(name.substr(-1)){
		case '$':
			return "string";
		case '#':
			return "array";
		default:
			return "numero";
	}
}

function arrayRight(array,elements){
	return elements?array.slice(-elements):[];
}

function last(array){
	return array[array.length-1];
}

function expectedMessage(wanted,got){
	return "Esperando "+wanted+", Tengo `"+got+"` en su lugar.";
}

function expected(wanted,got){
	return "Esperando "+wanted+", Tengo `"+got+"` en su lugar.";
}
