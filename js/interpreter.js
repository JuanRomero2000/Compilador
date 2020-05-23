//=>==>==>==>==>==>==>=//
//12-BASIC interpreter!//
//=>==>==>==>==>==>==>=//

var ast,functions;
var ip,block,ifs,switches;
var variables;
var line;
var killEXPR;
var stopped=true,interval;
var steps=1000,stepDelay=1,doVsync=false;

var inputs=[];
var consoleColor,consoleBG;
var stack=[];

var consoleOut;

window.addEventListener("load",function(){
	consoleOut=new Output($console);
});

//run code
function run(astIn){
	ast=astIn;
	ip=[-1];
	block=[ast[0]];
	ifs=[];
	switches=[];
	functions=ast[2];
	variables=[scopeFromTemplate(ast[1])];
	stopped=false;
	inputs=$input.value.split("\n");
	stepLevel2();
}

//get array of values from list of types
function scopeFromTemplate(template){
	return template.map(function(x){
		return new Variable(x.type);
	});
}

function stepLevel2(){
	if(!stopped)
		interval=window.setInterval(stepLevel1,stepDelay);
}

function stepLevel1(){
	for(var i=0;i<steps;i++){
		if(stopped)
			break;
		step();
	}
}

//end program
function stop(error){
	if(!stopped){
		console.log("Tratando de terminar...");
		stopped=true;
		window.clearInterval(interval);
		consoleOut.print("==================== ["+currentTimeString()+"]\n");
		console.log("Error",error);
		consoleOut.print("Programa terminado\n");
	}
	if(error)
		consoleOut.print("[Error] en la linea "+line+":\n"+error+"\n",undefined,"#FF7777");
}

function enterBlock(into){
	block.push(into||current(block).code[current(ip)]);
	if(!into)
		ip[ip.length-1]++;
	ip.push(-1);
	ifs.push(0);
	switches.push(undefined);
}

function leaveBlock(){
	if(last(block).type==="FUNC")
		variables.pop();
	block.pop();
	ip.pop();
	ifs.pop();
	switches.pop();
}

function current(stack){
	return stack[stack.length-1];
}

function callFunction(name,args){
	if(builtins[name]){
		if(builtins[name][args.length]){
			return builtins[name][args.length].apply(null,args);
		}else{
			assert(builtins[name].any,"\""+name+"\" no se acepta "+args.length+" argumentos");
			return builtins[name].any(args);
		}
	}else{
		assert(functions[name] && functions[name].inputs.length===args.length,"función de usuario no esta definida");
		var parameters=functions[name].inputs;
		variables.push(scopeFromTemplate(functions[name].variables));
		for(var i=0;i<parameters.length;i++){
			if(parameters[i].isRef){
				//perhaps: <type1> REF <type2> <var>
				//meaning that the variable must be of <type1> but the value must be <type2> (as <var> is created with a type of <type2>)
				assert(args[i].ref,"la función requiere variable");
				var x=parameters[i].getFrom(variables);
				//assert(x.type!=="dynamic","Dynamic type not allowed here");
				//assert(x.type==="unset" || x.type===args[i].ref.value.type,"Function '"+name+"' expected "+x.type+" variable as "+th(i+1)+" argument, got "+args[i].ref.type+" variable instead.");
				parameters[i].getFrom(variables).set(args[i]);//type check
				parameters[i].matchRef(variables,args[i].ref);
			}else
				parameters[i].getFrom(variables).set(args[i]);
		}
		enterBlock(functions[name]);
		//mi wile moli.
		while(1){
			var x=step();
			if(stopped)
				break;
			if(x!==undefined)
				return x;
		}
	}
}

///////////////////////
//evaluate expression//
///////////////////////
function evaluate(rpn,expectedType){
	assert(rpn.constructor===Array,"Error interno: expresión no valida");
	//assert(!(unUsed && rpn.length===1 && rpn[0].type==="variable" && !rpn[0].isDec),"Variable '"+rpn[0].name+"' was used on its own. This is probably a mistake.");
	var initialLength=stack.length;
	console.log(rpn)
	for(var i=0;i<rpn.length;i++){
		switch(rpn[i].type){
			case "variable":
				var ref=rpn[i].variable.getFrom(variables);
				var x=ref.value.copy();
				x.ref=ref;
				stack.push(x);
			break;case "number":case "string":case "array":
				stack.push(rpn[i]);
			break;case "index":
				var index=stack.pop();
				var array=stack.pop();
				index.expect("number");
				index=Math.floor(index.value);
				assert(index>=0 && index<array.value.length,"Intenta acceder al elemento"+index+" de una matriz con longitud "+array.value.length+".");
				var x=array.value[index];
				if(array.ref)
					x.ref=new Variable("dinamico",array.ref.value.value[index]);
				stack.push(x);
			break;case "operator":case "function":case "unary": //I think these are all just "function" ...
				var args=rpn[i].args;
				assert(args<=stack.length,"Internal error: stack underflow");
				var retval;
				retval=callFunction(rpn[i].name,arrayRight(stack,args));
				for(var j=0;j<args;j++)
					stack.pop();
				if(!retval)
					assert(i===rpn.length-1,"La función no devolvio un valor y no fue la ultima operacion.");
				stack.push(retval);
			break;case "arrayLiteral":
				var args=rpn[i].args;
				var array=new Value("array",arrayRight(stack,args));
				for(var j=0;j<args;j++)
					stack.pop();
				stack.push(array);
			break;default:
				assert(false,"Internal error: bad token "+rpn[i].type);
		}
		if(killEXPR){
			while(stack.length > initialLength)
				stack.pop();
			return true;
		}
	}
	assert(stack.length-1===initialLength,"Internal error, stack leak");
	var returned=stack.pop();
	if(expectedType)
		returned.expect(expectedType);
	return returned;
}

function print(text){
	consoleOut.print(text,consoleColor,consoleBG);
	//$console.scrollTop=$console.scrollTopMax;
}

function jumpTo(pos){
	ip[ip.length-1]=pos;
}

function step(){
	killEXPR=false;
	jumpTo(current(ip)+1);
	/////////////////
	//exiting block//
	/////////////////
	while(current(ip)>=current(block).code.length){
		var now=current(block);
		line=now.line;
		switch(now.type){
			case "MIENTRAS":
				if(evaluate(now.condition).truthy())
					jumpTo(0);
				else
					leaveBlock();
			break;case "DO":
				jumpTo(0);
				//...
			break;case "REPITA":
				if(!evaluate(now.condition).truthy())
					jumpTo(0);
				else
					leaveBlock();
			break;case "PARA":
				//get variable
				var variable;
				assert(variable=evaluate(now.variable,"number").ref,"PARA, el bucle necesita una variable.");
				//increment variable
				if(now.step){
					variable.value.value+=evaluate(now.step,"number").value;
				}else
					variable.value.value++;
				//check if past end
				if(now.array){
					var inRange=variable.value.value<evaluate(now.array,"array").value.length;
				}else{
					var value=evaluate(now.end,"number");
					if(now.open)
						var inRange=variable.value.value<value.value;
					else
						var inRange=variable.value.value<=value.value;
				}
				//exit
				if(inRange)
					jumpTo(0);
				else
					leaveBlock();
			break;case "main":
				stop();
				return;
			break;case "FUNC":
				leaveBlock();
				return false;
			break;case "SI":case "SINO":case "SNSI":case "CASE":case "SWITCH":
				leaveBlock();
			break;default:
				assert(false,"Error Interno: '"+now.type+"' no es un tipo de bloque válido.");
		}
	}
	var now=current(block).code[current(ip)];
	line=now.line;
	//////////////////
	//entering block//
	//////////////////
	switch(now.type){
		case "MIENTRAS":
			if(evaluate(now.condition).truthy())
				enterBlock();
		break;case "DO":
			enterBlock();
		break;case "REPITA":case "FUNC":
			enterBlock();
		break;case "PARA":
			var variable;
			assert(variable=evaluate(now.variable,"number").ref,"PARA loop needs a variable.");
			if(now.start)
				variable.value.value=evaluate(now.start,"number").value;
			else
				variable.value.value=0;
			//check if past end
			if(now.array){
				var inRange=evaluate(now.array,"array").value.length>0;
			}else{
				var value=evaluate(now.end,"number");
				if(now.open)
					var inRange=variable.value.value<value.value;
				else
					var inRange=variable.value.value<=value.value;
			}
			if(inRange)
				enterBlock();
		break;case "EXIT":
			for(var i=block.length-1;i>0;i--){
				if(now.exitType==="FUNC" ? block[i].type==="FUNC" && now.exitName===block[i].name : block[i].type===now.exitType){
					leaveBlock();
					break;
				}
				leaveBlock();
			}
			if(!now.exitName)
				jumpTo(current(ip)-1); //idk why this is needed but I want to die now
			assert(i,"`EXIT` No se puedo encontrar `"+now.exitType+"` para salir.");
			killEXPR=true;
			return true;
			//for(var i=0;i<now.levels;i++)
			//	leaveBlock();
		//wow why's this part so hecking long?
		//break;case "BREAK": //M U L T I - L E V E L   B R E A K !
		break;case "CONTINUE":
			while(1){
				var x=current(block);
				if(x.type==="main"){
					assert(false,"CONTINUE debe usarse dentrode un PARA, MIENTRAS, REPITA, o DO loop");
				}else if(x.type==="PARA"||x.type==="MIENTRAS"||x.type==="REPITA"||x.type==="DO"){
					jumpTo(Infinity);
					break;
				}
				leaveBlock();
			}
		break;case "IMPRIMIR":
			var printString="";
			for(var i=0;i<now.value.length;i++){
				var x=evaluate(now.value[i]);
				assert(x.constructor===Value,"valor invalido para imprimir");
				printString+=(i>0?" ":"")+x.toString();
			}
			print(printString+"\n");
		break;case "expression":
			evaluate(now.value);
		break;case "SI":
			if(evaluate(now.condition).truthy()){
				ifs[ifs.length-1]=true;
				enterBlock();
			}else
				ifs[ifs.length-1]=false;
		break;case "SINO":
			if(!ifs[ifs.length-1])
				enterBlock();
		break;case "SNSI":
			if(!ifs[ifs.length-1]){
				if(evaluate(now.condition).truthy()){
					ifs[ifs.length-1]=true;
					enterBlock();
				}
			}
		break;case "RETURN":
			while(1){
				var x=current(block);
				leaveBlock();
				if(x.type==="FUNC")
					break;
			}
			if(now.value)
				return evaluate(now.value);
			return false;
		break;case "SWITCH":
			var condition=evaluate(now.condition);
			enterBlock();
			switches[switches.length-1]=condition;
			ifs[ifs.length-1]=false;
		break;case "CASE":
			if(now.conditions){
				for(var i=0;i<now.conditions.length;i++){
					var condition=evaluate(now.conditions[i]);
					if(equal(switches[switches.length-1],condition).truthy()){
						ifs[ifs.length-1]=true;
						enterBlock();
						break;
					}
				}
			}else if(ifs[ifs.length-1]===false)
				enterBlock();
		break;default:
			assert(false,"instruccion no compatible "+now.type);
	}
}

function getNextInputValue(){
	var x=inputs.shift();
	if(x===undefined)
		x="";
	return new Value("string",x);
}

function assert(condition,message){
	//console.log(condition,message)
	if(!condition){
		stop(message);
		console.log(message);
		var error=new Error(message);
		error.name="RunError";
		throw error;
	}
}