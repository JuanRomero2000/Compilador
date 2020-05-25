// lista de palabras clave
// no incluye OPERADORES o CONSTANTES o palabras clave falsas TO / STEP



var KEYWORDS=["SWITCH","CASE","AS","ENDSWITCH", "EXIT","END", "SI","ENTONCES","SINO","SNSI","FINSI", "FUNC","RETURN","ENDFUNC", "PARA","FPARA", "REPITA","SCUMPLE", "CONTINUE","IMPRIMIR", "MIENTRAS","FMIENTRAS", "DO","LOOP", "REF", "HASTA", "DE","IN"];
// CHECK <condicion>, "error"
var constants={"#PI":Math.PI,"#VERSION":1.500};
// sistema de versión:
//x.000 - número de versión principal
//0.xx0 - número de versión menor
//0.00x - incluso menos significativo

//code->tokens
// input: código (cadena)
// output: función que devuelve el siguiente token cuando se llama
function tokenize(code){
	var i=-1,c,isAlpha,isDigit,whitespace,prev=0;
	var line=1,currentLine,column=1,currentColumn;
	
	function next(){
		column++;
		if(c==='\n'){
			line++;
			column=1;
		}
		i++;
		c=code.charAt(i);
		///
		isAlpha=(c>='A'&&c<='Z'||c>='a'&&c<='z');
		isDigit=(c>='0'&&c<='9');
	}
	
	function getWord(startSkip,endSkip){
		return code.substring(startSkip!==undefined?whitespace+startSkip:whitespace,endSkip!==undefined?i-endSkip:i);
	}
	
	function pushWord(){
		prev=i;
		
		var upper=getWord().toUpperCase(); //optimizado solo en mayusculas si la palabra es de 5 caracteres o menos
		var type;
		//bit a bit no
		if(upper==="NOT")
			type="unary";
		//Operadores de palabras
		else if(upper==="AND"||upper==="OR"||upper==="XOR")
			type="operator";
		//numero de palabra clave
		else if(upper==="TRUE"){
			type="number";
			upper=1;
		}else if(upper==="INFINITY"){
			type="number";
			upper=Infinity;
		}else if(upper==="FALSE"){
			type="number";
			upper=0;
		//otra palabra clave
		}else if(KEYWORDS.indexOf(upper)!==-1)
			type=upper;
		//no es una palabra clave
		else
			type="word";
		
		return push(type,upper);
	}
	
	function push(type,word){
		prev=i;
		return {column:currentColumn,line:currentLine,type:type,word:word!==undefined ? word : getWord()};
	}
	
	next();
	return function(){
		//leer espacios en blanco
		while(c===' '||c==='\t')
			next();
		//si este es el final, empuje un token final especial
		if(c==='')
			return push("eof");
		//almacenar el inicio del espacio no en blanco
		currentLine=line;
		currentColumn=column;
		whitespace=i;
		//"palabra" (palabras clave, funciones, variables)
		if(isAlpha||c==='_'){
			next();
			while(isAlpha||isDigit||c==='_')
				next();
			if(c==='$'||c==='#'||c==='@')
				next();
			return pushWord();
		//numbers
		}else if(isDigit){
			do
				next();
			while(isDigit);;;
			var c2=code.charAt(i+1);
			if(c==='.' && c2>='0' && c2<='9'){
				next();
				while(isDigit)
					next();
			}
			return push("number",parseFloat(getWord()));
		}else if(c==='.'){
			next();
			if(isDigit){
				do
					next();
				while(isDigit);;;
				return push("number",parseFloat(getWord()));
			}
			return push("dot");
		}else switch(c){
		//strings
		case '"':
			var stringValue="";
			while(1){
				next();
				if(c===''){
					break;
				}else if(c==='"'){
					next();
					if(c!=='"')
						break;
					else
						stringValue+='"';
				}else
					stringValue+=c;
			}
			return push("string",stringValue);
		//commentarios
		break;case '\'':
			next();
			while(c && c!=='\n' && c!=='\r')
				next();
			next();
			return push("linebreak","");
		//constantes
		break;case '#':
			next();
			if(isAlpha||isDigit||c==='_'){
				next();
				while(isAlpha||isDigit||c==='_')
					next();
				var constName=getWord().toUpperCase();
				var constValue=constants[constName];
				if(constValue!==undefined)
					return push("number",constValue);
				else
					return push("error");
			}
			return push("error");
		// < <= <<
		break;case '<':
			next();
			if(c==='='||c==='<')
				next();
			return push("operator");
		// > >= >>
		break;case '>':
			next();
			if(c==='='||c==='>')
				next();
			return push("operator");
		// = ==
		break;case '=':
			next();
			if(c==='='){
				next();
				return push("operator");
			}
			return push("equal");
		// ! !=
		break;case '!':
			next();
			if(c==='='){
				next();
				return push("operator");
			}
			return push("unary");
		// - ~
		break;case '-':case '~':
			next();
			return push("maybeUnary");
		//add, subtract, multiply, divide, bitwise and, or
		break;case '+':case '*':case '/':case '&':case '|':case '%':case '\\':case '^':
			next();
			return push("operator");
		//other
		break;case '\n':case '\r':
			next();
			return push("linebreak");
		//characters
		break;case '(':case ')':case '[':case ']':case '{':case '}':case ',':case ':':case ';':
			var chr=c;
			next();
			return push(chr);
		//print shortcut
		break;case '?':
			next();
			return push("IMPRIMIR");
		//other
		break;default:
			next();
			return push("text");
		}
	};
}