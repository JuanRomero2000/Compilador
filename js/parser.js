//parser
//tokens->ast
function parse(/*function*/nextToken){
	
	//current token
	var type,word,line,column;
	var /*boolean*/readNext=true;
	
	var noEquals,noTo;
	
	var current={};
	var currentBlocks=[];
	var variables=[[]];
	var functions={};
	//expression parsing
	var operatorStack,outputStack;
	
	var ENDS={
		SWITCH:"ENDSWITCH",
		CASE:"ENDSWITCH",
		REPITA:"SCUMPLE",
		MIENTRAS:"FMIENTRAS",
		DO:"LOOP",
		SI:"FINSI",
		SNSI:"FINSI",
		SINO:"FINSI",
		FUNC:"ENDFUNC",
		PARA:"FPARA",
		FORIN:"FPARA"
	}
	
	//enter code block
	function startBlock(){
		current.code=[];
		current.line=line;
		currentBlocks.push(current);
		current={};
	}
	//leave code block
	function endBlock(){
		var block=currentBlocks.pop();
		last(currentBlocks).code.push(block);
	}
	
	function autoEndBlock(endKeyword){
		var currentBlockType=last(currentBlocks).type;
		if(endKeyword!==undefined)
			assert(ENDS[currentBlockType]===endKeyword,"Got `"+endKeyword+"` while inside of `"+currentBlockType+"`.");
		//else if(readToken("word"))
			//assert(word===currentBlockType,"END was labelled `"+word+"` while inside of `"+currentBlockType+"`.");
		switch(currentBlockType){
			case "MIENTRAS":case "DO":case "SWITCH":
			break;case "CASE":
				endBlock();
			break;case "REPITA":
				assert(last(currentBlocks).condition=readExpression(),expected("condition for SCUMPLE",word));
			break;case "SI": case "SNSI": case "SINO":
				ifThisLine=false;
			break;case "PARA": case "FORIN":
				readExpression();
			break;case "FUNC":
				var block=currentBlocks.pop();
				block.variables=variables.pop();
				functions[block.name]=block;
				return; //do not run endBlock here!
			break;default:
				assert(false,"Error interno: intento finalizar el bloque desconocido `"+currentBlockType+"`.");
		}
		endBlock();
	}
	
	//control single line IF statement
	var ifThisLine=false,codeAfterThen;
	
	current.type="main";
	startBlock();
	
	//main
	do{
		try{
			readStatement();
		}catch(error){
			if(error.name==="ParseError")
				return error.message+"\nLine "+line+", column "+column+".";
			//bad error!!!
			else
				throw error;
		}
	}while(type!=="eof");;;
	
	//read a "line" of code
	function readStatement(){
		next();
		if(type!="comment" && ifThisLine && type!="linebreak")
			codeAfterThen=true;
		current.line=line;
		switch(type){
			case "END":
				autoEndBlock();
			break;case "ENDSWITCH":case "SCUMPLE":case "FINSI":case "FPARA":case "FMIENTRAS":case "ENDFUNC":case "LOOP":
				autoEndBlock(type);
			//SWITCH/CASE/ENDSWITCH
			break;case "SWITCH":
				current.type="SWITCH";
				assert(current.condition=readExpression(),expected("value for SWITCH statement",word));
				startBlock();
			break;case "CASE":
				var currentType=last(currentBlocks).type;
				if(currentType==="CASE")
					//end previous case (no break required!)
					endBlock();
				else
					//This is if it's the first CASE after SWITCH
					assert(currentType==="SWITCH","CASE Sin SWITCH");
				//start block
				current.type="CASE";
				assert(current.conditions=readList(readExpression),expected("valor para CASE",word));
				startBlock();
			//REPEAT
			break;case "REPITA":
				current.type="REPITA";
				startBlock();
			//IF/ELSEIF/ELSE
			break;case "SI":
				current.type="SI";
				assert(current.condition=readExpression(),expected("condición para SI",word));
				assert(readToken("ENTONCES"),expected("`ENTONCES` despues de SI",word));
				startBlock();
				ifThisLine=true;
				codeAfterThen=false;
			break;case "SNSI":
				var currentType=last(currentBlocks).type;
				assert(currentType==="SI"||currentType==="SNSI","SNSI sin -> SI");
				endBlock();
				current.type="SNSI";
				current.condition=readExpression();
				assert(readToken("ENTONCES"),expected("`ENTONCES` despues de SNSI",word));
				startBlock();
			break;case "SINO":
				var currentType=last(currentBlocks).type;
				//SWITCH
				if(currentType==="CASE"){
					//end previous CASE
					endBlock();
					//start new CASE
					current.type="CASE";
					startBlock();
				//IF
				}else{
					assert(currentType==="SI"||currentType==="SNSI","SINO sin SI.");
					//end previous IF/ELSEIF section
					endBlock();
					//start ELSE section
					current.type="SINO";
					startBlock();
				}
			//FOR
			break;case "PARA":
				//read variable
				noEquals=true;
				assert(current.variable=readExpression(),expected("Variable despues de PARA",word));
				noEquals=false;
				current.type="PARA";
				if(readToken("equal")){
					//read start
					noTo=true;
					current.start=readExpression();
					noTo=false;
					if(!readToken("HASTA")){
						assert(readToken("SCUMPLE"),expected("`HASTA` in PARA",word));
						current.open=true;
					}
					current.end=readExpression();
					if(readToken("DE"))
						current.step=readExpression();
				}else{
					assert(readToken("IN"),expected("`=` o `IN` en PARA",word));
					current.array=readExpression();
				}
				startBlock();
			//WHILE
			break;case "MIENTRAS":
				current.type="MIENTRAS";
				assert(current.condition=readExpression(),expected("condicion para  MIENTRAS",word));
				startBlock();
			//do
			break;case "DO":
				current.type="DO";
				startBlock();
			break;case "EXIT":
				current.type="EXIT";
				next();
				if(type==="word"){
					current.exitType="FUNC";
					current.exitName=word;
				}else{
					assert(type==="PARA"||type==="SI"||type==="SWITCH"||type==="MIENTRAS"||type==="REPITA"||type==="DO"||type==="FUNC","Tipo de SALIDA no valido");
					current.exitType=type;
				}
				
			break;case "BREAK":
				current.type="BREAK";
				current.levels=readExpression();
			break;case "CONTINUE":
				current.type="CONTINUE";
			//FUNC/RETURN
			break;case "FUNC":
				current.type="FUNC";
				variables.push([]);
				assert(readToken("word"),"Falta el nombre al crear la funcion.");
				current.name=word;
				assert(readToken("("),"Esperando '(' para comenzar la lista de entrada de funciones, tengo '"+word+"' en lugar.");
				current.inputs=readList(readDeclaration);
				assert(readToken(")"),"Expected ')' para finalizar la lista de entrada de funciones, obtuve '"+word+"' en lugar.");
				startBlock();
			break;case "RETURN":
				current.type="RETURN";
				current.value=readExpression();
			break;case "IMPRIMIR":
				current.type="IMPRIMIR";
				current.value=readList(readExpression);
			//comment
			break;case "comment":case ";":
			//line break, end
			break;case "eof":case "linebreak":
				if(ifThisLine){
					ifThisLine=false;
					if(codeAfterThen){
						endBlock();
						console.log("linea unica terminada en SI");
					}
				}
			break;default:
				readNext=false;
				assert(current.value=readExpression(),expectedMessage("statement",word));
				current.type="expression";
		}
		if(current.type){
			last(currentBlocks).code.push(current);//push to current block!
			current={};
		}
	}
	
	function readDeclaration(){
		if(readToken("word"))
			return vari();
		if(readToken("REF")){
			assert(readToken("word"),"REF necesita un nombre de variable");
			var x=vari();
			x.isRef=true;
			return x;
		}
		return false;
	}
	
	//Try to read a specific token
	function readToken(wantedType){
		next();
		if(type===wantedType){
			readNext=true;
			return true;
		}
		readNext=false;
		return false;
	}
	
	//Read list
	//reader: function to read item (readExpression etc.)
	function readList(reader){
		var ret=[];
		var x=reader();
		if(x)
			ret.push(x);
		if(readToken(",")){
			assert(x,"Ranura vacia en la lista");
			do
				assert(ret.push(reader()),"Valor nulo no permitido");
			while(readToken(","));;;
		}
		return ret;
	}
	
	function findVar(name){
		for(var i=variables.length-1;i>=0;i--)
			for(var j=0;j<variables[i].length;j++)
				if(variables[i][j].name===name)
					return new IndirectVariableReference(i,j,name);
		consoleBG="yellow";
		print("[Advertencia] Variable `"+name+"` No ha sido declarada. Usa <type> <name> (ej: 'NUMBER a=4').\n");
		consoleBG=undefined;
		return createVar(name,"unset");
	}
	
	function createVar(name,type){
		var currentScope=last(variables);
		for(var i=0;i<currentScope.length;i++)
			if(currentScope[i].name===name)
				return new IndirectVariableReference(variables.length-1,i,name);
		return new IndirectVariableReference(variables.length-1,currentScope.push({name:name,type:type})-1,name);
	}
	
	function readList2(reader){
		var ret=[];
		var x=reader();
		if(x)
			ret.push(x);
		if(readToken(",")&&pushToken({type:"comma"})){
			assert(x,"Valor nulo no permitido");
			do
				assert(ret.push(reader()),"Valor nulo no permitido");
			while(readToken(",")&&pushToken({type:"comma"}));;;
		}
		return ret;
	}
	
	//read normal expression
	//SHould return RPN list
	function readExpression(){
		operatorStack=[];
		outputStack=[];
		if(readExpression2()){
			return simplify(outputStack.concat(operatorStack.reverse()));
		}
		return false;
	}
	
	function prec(token){
		if(token.type==="unary" || token.type==="comma")
			return Infinity; //yay;
		assert(builtins[token.name].precedence!==undefined,"Error interno: no se pudo obtener la prioridad del operador para `"+token.type+"`"+token.name+"`.")
		return builtins[token.name].precedence;
	}
	
	//I should... um
	function left(token){
		return 0;
	}
	
	function pushToken(token){
		switch(token.type){
			//values are pushed to the output directly
			case "number":case "string":
				outputStack.push(new Value(token.type,token.value));
			//variables too
			//functions, the array literal operator, and index operator, are all pushed AFTER their arguments (FUNC(1,2,3) -> 1,2,3,FUNC) so they can also be output right away
			break;case "variable":case "function":case "arrayLiteral":case "index": //see, functions are actually pushed AFTER their arguments, so we can just send them directly to the output! :D
				outputStack.push(token);
			break;case "operator":case "unary":
				while(operatorStack.length){
					var top=last(operatorStack);
					if(top.type!="(" && (prec(top)>=prec(token)))
						outputStack.push(operatorStack.pop());
					else
						break;
				}
				//token.type="operator";
				operatorStack.push(token);
			break;case "comma":
				while(operatorStack.length && last(operatorStack).type!="(")
					outputStack.push(operatorStack.pop());
			break;case "(":
				operatorStack.push(token);
			break;case ")":
				//read tokens until next (
				while(last(operatorStack).type!="(")
					outputStack.push(operatorStack.pop());
				//remove (
				operatorStack.pop();
			break;default:
				assert(false,"Error interno : '"+token.type+"' no es un tipo de token valido.");
		}
		return true;
	}
	
	function vari(name){
		name = name || word;
		if((name==="STRING"||name==="NUMBER"||name==="ARRAY"||name==="DYNAMIC")&&readToken("word"))
			return createVar(word,name.toLowerCase());
		if(name==="VAR"&&readToken("word"))
			return createVar(word,"unset");
		return findVar(name);
	}
	
	function readExpression2(){
		next();
		switch(type){
			//function or variable
			case "word":
				var name=word;
				//function
				if(!readFunction())
					pushToken({type:"variable",variable:vari(name),name:name});
			//number literals
			break;case "number":
				pushToken({type:"number",value:word});
			//string/label
			break;case "string":
				pushToken({type:"string",value:word});
			//operator (unary)
			break;case "unary":case "maybeUnary":
				var name=word;
				pushToken({type:"unary",name:word,args:1});
				assert(readExpression2(),expectedMessage("Valor despues del operador `"+name+"`",word));
			//open parenthesis
			break;case "(":
				pushToken({type:"("});
				readExpression2();
				assert(readToken(")"),"Missing \")\"");
				pushToken({type:")"});
			break;case "[":
				pushToken({type:"("});
				var x=readList2(readExpression2);
				assert(readToken("]"),"Missing `]`");
				pushToken({type:")"});
				pushToken({type:"arrayLiteral",args:x.length});
			//other crap
			break;default:
				readNext=false;
				return false;
		}
		//read [index] and .function
		while(1)
			if(readToken("[")){
				pushToken({type:"("});
				assert(readExpression2(),expectedMessage("index value",word));
				assert(readToken("]"),expectedMessage("`]`",word));
				pushToken({type:")"});
				pushToken({type:"index",args:"2"});
			}else if(readToken("dot"))
				assert(readToken("word") && readFunction(1),expectedMessage("funcion despues `.`",word));
			else
				break;
		//TO can be normal operator or ternary operator with STEP.
		if(!noTo&&readToken("HASTA")){
			var name=word;
			var x={type:"operator",name:word,args:2};
			pushToken(x);
			assert(readExpression2(),expectedMessage("Segundo argumento para el operador `"+name+"`",word));
			if(readToken("DE")){
				x.args=3;
				assert(readExpression2(),"Esperando DE valor, tengo `"+word+"` en su lugar.");
			}
		//normal 2 argument operator.
		}else if(readToken("operator")||readToken("maybeUnary")||(!noEquals&&readToken("equal"))){
			var name=word;
			pushToken({type:"operator",name:word,args:2});
			assert(readExpression2(),expectedMessage("Segundo argumento para el operador `"+name+"`",word));
		}
		return true;
	}
	
	function readFunction(extraLength){
		var name=word;
		if(readToken("(")){
			pushToken({type:"("});
			var x=readList2(readExpression2);
			assert(readToken(")"),expectedMessage("`)` despues de la llamada a la funcion",word));
			pushToken({type:")"});
			pushToken({type:"function",name:name,args:x.length+(extraLength||0)}); //optimize: replace name with reference to function
			return true;
		}
	}
	
	//throw error with message if condition is false
	function assert(condition,message){
		if(!condition){
			console.log(message);
			var error=new Error(message);
			error.name="ParseError";
			throw error;
		}
	}
	
	function next(){
		//assert(readNext===false||readNext===true,"invalid readnext?");
		if(readNext){
			var items=nextToken();
			type=items.type;
			word=items.word;
			line=items.line;
			column=items.column;
		}else
			readNext=true;
	}
	
	//handle single line IF blocks at the end of the program (temporary fix)
	if(ifThisLine){
		ifThisLine=false;
		if(codeAfterThen){
			endBlock();
			console.log("línea unica terminada SI");
		}
	}
	
	if(currentBlocks.length>1)
		return "Unclosed "+currentBlocks[1].type;
	return [currentBlocks[0],variables[0],functions];
}