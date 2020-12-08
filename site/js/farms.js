;(async function () {
'use strict'

//define user data
function User() {
    this.fields = [];
}

//variables for shader program
function modelVars() {
    this.eonr = 130.0;
    this.m = 10;
    this.sithresh = 0.7;
    this.npre = 0;
}

//maintain "global" values
function pageState() {
    this.tab = 'FieldManagement',
    this.mouseoverField = null;
    this.iLoad = 1;
    this.map = null;
    this.mapOutput = null;
    this.editing = [];
    this.cornerTiles = null;
    this.coords = null;
}

//map layer names
var layers = [
    'userFields',
    'outline',
    'county'
    //'polys'
]

var user = new User();
var page = new pageState();
var modelvars = new modelVars();

//***************************************
//Functions that contact bucket
//***************************************

//check if object in bucket
async function checkExists(folder, file) {
    let config = await (await fetch('/config.json')).json();
    let auth = await authentication;
    let home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });
    let userId = (await auth.auth0.getIdTokenClaims()).sub;
    
    home.config.credentials = auth.awsCredentials;
    let fileExists = await home.headObject({Key:userId+"/"+folder+"/"+file}, function(err, data) {
        console.log(JSON.stringify(err)+" "+JSON.stringify(data));
    })
    return fileExists;
}

//save object to bucket
async function putJSON(key,object) {
    let config = await (await fetch('/config.json')).json();
    let auth = await authentication;
    let home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });
    let userId = (await auth.auth0.getIdTokenClaims()).sub;
    
    home.config.credentials = auth.awsCredentials;
    return await home.putObject({
        Key:userId+"/"+key,
        Body:JSON.stringify(object),
        ContentType: "application/json"}).promise();
}

//load json object from bucket
async function getJSON(key) {
    let config = await (await fetch('/config.json')).json();
    let auth = await authentication;
    var home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });

    let userId = (await auth.auth0.getIdTokenClaims()).sub;
   
    home.config.credentials = auth.awsCredentials;
    return await home.getObject({
        Key:userId+"/"+key,
    }).promise();
}

//save polygons drawn on map to bucket
async function savePolygons() {
    var data = page.draw.getAll();
    user.fields.features = user.fields.features.concat(data.features);
    page.draw.deleteAll();
    putJSON("fields/fields.json", user.fields).then(function(d) {
        var objDiv = document.getElementById("selectedFields");
        objDiv.scrollTop = objDiv.scrollHeight;
        var updated = blank();
        updated.features = user.fields.features;
        page.map.getSource('userFields').setData(updated);
        updateFieldDivs();
    });
}
document.querySelector('.saveButton').onclick = savePolygons


//make saved polygons editable again
function editPolygons() {
    var saved = user.fields.features;
    var editing = blank();
    editing.features = page.draw.getAll().features.concat(saved);
    page.editing = editing;
    page.draw.add(page.editing);
    user.fields.features = [];
    page.map.getSource('userFields').setData(user.fields);
    updateFieldDivs();
}
document.querySelector('.editButton').onclick = editPolygons


//***************************************
//End functions that contact bucket
//***************************************

function setPre(val) {
    modelvars.npre = val;
}

function toggleLayer(el) {
    for (let i=0; i<layers.length;i++) {
        var visibility = page.map.getLayoutProperty(layers[i], 'visibility');
        if (visibility === 'visible') {
        page.map.setLayoutProperty(layers[i], 'visibility', 'none');
        d3.select(el).classed('stepClassed',false);
        } else {
        page.map.setLayoutProperty(layers[i], 'visibility', 'visible');
        d3.select(el).classed('stepClassed',true);
        }
    }
}
document.querySelector('.layerButton').onclick = toggleLayer


//To generate sliders
function Slider(id, field, domain) {
    var self=this;
    this.margin = {right:25, left:25};
    this.selection = d3.select("#"+id);
    this.selection.append("text")
    .attr("x",2)
    .attr("y",12)
    .text(field)
    .style("fill","white");
    this.hue = function(h) {
        modelvars[field] = h;
        self.handle.attr("cx", self.x(h));
        render(document.getElementById('clipCanvas'), gl, program);
        render(document.getElementById('clipCanvas'), glEncoded, programEncoded);
        mapRender();
    };
    this.x = d3.scaleLinear()
        .domain(domain)
        .range([0, +self.selection.attr("width")-self.margin.right - self.margin.left])
        .clamp(true);
    this.slider = self.selection.append("g")
    .attr("class","slider")
    .attr("transform", "translate(" + self.margin.left + "," + self.selection.attr("height") / 2 + ")");
    this.slider.append("line")
    .attr("class", "track")
    .attr("x1", self.x.range()[0])
    .attr("x2", self.x.range()[1])
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-inset")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-overlay")
    .call(d3.drag()
        .on("start.interrupt", function() { self.slider.interrupt(); })
        .on("start drag", function() { self.hue(self.x.invert(d3.event.x)); }));
    this.slider.insert("g", ".track-overlay")
    .attr("class", "ticks")
    .attr("transform", "translate(0," + 18 + ")")
    .selectAll("text")
    .data(self.x.ticks(5))
    .enter().append("text")
    .style("fill","white")
    .attr("x", self.x)
    .attr("text-anchor", "middle")
    .text(function(d) { return Math.round(d*100)/100; });
    this.handle = self.slider.insert("circle", ".track-overlay")
    .attr("class","handle")
    .attr("r",9)
    .attr("cx", self.x(modelvars[field]));
}

//generate 3 sliders
var eonrslider = new Slider("eonrSlider","eonr",[0,250]);
var mslider = new Slider("mSlider", "m", [0,50]);
var sithreshslider = new Slider("sithreshSlider","sithresh",[0,1]);


//create colorbar
var colorCanvas = document.getElementById("colorCanvas");
colorCanvas.width = 200;
colorCanvas.height=25;
var colorctx = colorCanvas.getContext('2d');
var grdt=colorctx.createLinearGradient(0,0,200,25);
var stops = [0, 0.25, 0.5, 0.75, 1.0];

for (let i = 0; i<stops.length; i++) {
    grdt.addColorStop(stops[i],d3.interpolatePlasma(stops[i]));
}

colorctx.fillStyle = grdt;
colorctx.fillRect(0,0,200,25);

//function to show or hide "views"
function loadView(view) {
    d3.select('#'+page.tab).classed('stepClassed', false);
    d3.select('#'+view).classed('stepClassed', true);
    page.tab = view;

    if (view == 'FieldManagement') {
        loadFieldManagement();
    }
    if (view == 'ModelSelection') {
        loadModelSelection();
    }
}

//set up menu bar
var steps = [
    {'title':'Field Management',
    'id': 'FieldManagement'},
    {'title':'Model Selection',
    'id':'ModelSelection'}
]

var bar2Divs = d3.select('#bar2').selectAll('button').data(steps).enter().append('button').attr('class', 'step').text(function(d){
    return d['title'];
})
.attr('id', function(d) { return d['id'];})
.on('click', function(d) {
    loadView(d['id']);
});

bar2Divs.each(function(d) {
   
    if (d['id']==page.tab) {
        d3.select(this).classed('stepClassed',true);
    } else {
        d3.select(this).classed('stepClassed',false);
    }
});

//model (webgl) view
function loadModelSelection() {
    hideAll();
    page.draw.deleteAll();
    let canvas2 = document.getElementById('testCanvas');
    let ctx2 = canvas2.getContext('2d');
    ctx2.clearRect(0,0,canvas2.width,canvas2.height);
    d3.select("#modelContainer").style('display','inline-block');
    page.mapOutput.resize();
}

//function to change view on continue button click
d3.select(".continue")
    .on("click", function(d) {loadView("ModelSelection");});


//hide all views
function hideAll() {
    d3.select("#mapContainer").style('display','none');
    d3.select("#modelContainer").style('display','none');
}

//function to return blank geojson, which is helpful to initialize 
//layers that will be updated with user input
function blank() {
    return {
        type:"FeatureCollection",
        features:[]
    };
};

//function like python's range
function range(start, stop, step) {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};

//*********************************
//Functions to get appropriate data tiles
//*********************************

//given latitude and longitude, return tile space
function tile(lon, lat, n) {
    const convRad = Math.PI/180.0;
    let xtile = n * ((lon + 180) / 360);
    let ytile = n * (1 - (Math.log(Math.tan(lat*convRad) + (1/Math.cos(lat*convRad))) / Math.PI)) / 2;
    
    return [xtile, ytile];
}

//given latitude and longitude return pixel space
function pixel(lon, lat) {
    const zoom = 14;
    const n = Math.pow(2,zoom);
    const convRad = Math.PI/180.0;
    const tileSize = 256;
    let xpixel = Math.floor(tileSize * n * ((lon + 180) / 360));
    let ypixel = Math.floor(tileSize * n * (1 - (Math.log(Math.tan(lat*convRad) + (1/Math.cos(lat*convRad))) / Math.PI)) / 2);
    
    return [xpixel, ypixel];
}

//bounding box for field in tile space
function returnTiles(bbox) {
    const zoom = 14;
    const n = Math.pow(2,zoom);

    let tilesw = tile(bbox[0], bbox[1], n);
    let tilene = tile(bbox[2], bbox[3], n);

    return [tilesw, tilene];
}

//return latitude and longitude given tile space
function lonlat(xtile, ytile) {
    const zoom = 14;
    const n = Math.pow(2,zoom);
    let lon_deg = xtile / n * 360.0 - 180.0;
    let lat_rad = Math.atan(Math.sinh(Math.PI*(1-2 * ytile / n)));
    let lat_deg = lat_rad * 180 / Math.PI;
    return [lon_deg, lat_deg];
}

//AWS returns data in a format that needs to be converted to PNG image
function encode(data)
{
    var str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
    return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
}

//bind click handler to button
d3.select("#download").on("click", function(d) {
    let el = document.getElementById("webglContainer");
    let hidden = el.classList.contains("hidden");
    //if container is hidden, don't allow data processing
    //User must click field first
    if (hidden) {
        return;
    }
    decode(glEncoded);
})

//function do download javascript object as json
function exportToJson(object) {
    let filename = "export.json";
    let contentType = "application/json;charset=utf-8;";
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      var blob = new Blob([decodeURIComponent(encodeURI(JSON.stringify(object)))], { type: contentType });
      navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      var a = document.createElement('a');
      a.download = filename;
      a.href = 'data:' + contentType + ',' + encodeURIComponent(JSON.stringify(object));
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

//back out values encoded in rgb channels of webgl canvas
function decode(gl) {

    //readPixels doesn't work unless we render again inside this function
    render(document.getElementById('clipCanvas'), glEncoded, programEncoded);

    let width = gl.drawingBufferWidth;
    let height = gl.drawingBufferHeight;
    var pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
   
    let outJSON = blank();
    
    let tileWidth = Math.ceil(page.cornerTiles[1][0]) - Math.floor(page.cornerTiles[0][0]);
    let tileHeight = Math.ceil(page.cornerTiles[0][1]) - Math.floor(page.cornerTiles[1][1]);
    let tileMinX = Math.floor(page.cornerTiles[0][0]);
    let tileMaxY = Math.ceil(page.cornerTiles[0][1]);

    let pixelCount = 0;

    for (let i=0; i<pixels.length; i+=4) {
        let x = pixelCount % width;
        let y = Math.floor(pixelCount/width);
        let xPos = x/width;
        let yPos = y/height;
        let tileX = tileMinX + xPos*tileWidth;
        let tileY = tileMaxY - yPos*tileHeight;
        let latLon = lonlat(tileX, tileY);
        
        let r = pixels[i]/255.0;
        let g = pixels[i+1]/255.0;
        let b = pixels[i+2]/255.0;
        let a = pixels[i+3]/255.0;
        let decoded;

        //alhpa equal to zero is part of tile we don't care about
        if (a>0) {
            //10000 the same as in fragment shader. Could be an attribute instead of hard coded
            decoded = (r*1.0 + g*(1/255.0) + b*(1/65025.0))*10000;
            let feature = {
                "type":"Feature",
                "geometry": {
                    "type":"Point",
                    "coordinates":latLon
                },
                "properties": {
                    "value":Math.round(decoded)
                }
            };
            outJSON.features.push(feature);
        }
        pixelCount = pixelCount + 1;
        
    }

    //download json
    exportToJson(outJSON);
};

//*****************************
//webgl part
//*****************************

function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    else {
        console.log(gl.getShaderInfoLog(shader));
    }

  
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    else {
        console.log(gl.getProgramInfoLog(program));
    }

    
    gl.deleteProgram(program);
}

let webglCanvas = document.getElementById('webglCanvas');
let gl = webglCanvas.getContext("webgl");
if (!gl) {
    console.log("initialization of webgl was bad");
}

let webglCanvasEncoded = document.getElementById('webglCanvasEncoded');
let glEncoded = webglCanvasEncoded.getContext("webgl");
if (!glEncoded) {
    console.log("initialization of webgl was bad");
}


//Much of the webgl related code is from webglfundamentals, created by
//Gregg Tavares
var vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;

    void main() {
        //convert from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        //convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne *2.0;

        //convert from 0->2 to -1->1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        //pass texCoord to fragment
        v_texCoord = a_texCoord;

        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;
var fragmentShaderSource = `
    precision mediump float;

    //texture
    uniform sampler2D u_image0;
    uniform sampler2D u_image1;

    //passed from vertex
    varying vec2 v_texCoord;

    uniform float eonr;
    uniform float m;
    uniform float sithresh;
    uniform float npre;

    void main() {
        //look up color from texture
        vec4 color = texture2D(u_image0, v_texCoord);
        color.w = floor(color.w);
        float napp = max((eonr-npre),0.0) * sqrt((1.0-color.x)/((1.0-sithresh)*(1.0+0.1*exp(m*(sithresh-color.x)))));
        vec4 outcolor = texture2D(u_image1, vec2(min(1.0,napp/130.0),0.0));
        gl_FragColor = vec4(outcolor.x, outcolor.y, outcolor.z, color.w);
    }
`;

var fragmentShaderSourceEncoded = `
    precision mediump float;

    //texture
    uniform sampler2D u_image0;
    uniform sampler2D u_image1;

    //passed from vertex
    varying vec2 v_texCoord;

    uniform float eonr;
    uniform float m;
    uniform float sithresh;
    uniform float npre;

    //encode value in png
    void encode(in float v, out vec4 enc) {
        enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
        enc = fract(enc);
        enc -= enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
    }

    void main() {
        //look up color from texture
        vec4 color = texture2D(u_image0, v_texCoord);
        color.w = floor(color.w);
        float napp = max((eonr-npre),0.0) * sqrt((1.0-color.x)/((1.0-sithresh)*(1.0+0.1*exp(m*(sithresh-color.x)))));
        vec4 outt;
        //in order to encode, need to scale value 0-1. Chose 10000, which should be larger than any reasonable
        //maximum nitrogen application value
        encode(napp/10000., outt);
        gl_FragColor = vec4(outt.x, outt.y, outt.z, color.w);
    }
`;

//create shaders
var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

//shader that encodes floats in channels of PNG
var vertexShaderEncoded = createShader(glEncoded, glEncoded.VERTEX_SHADER, vertexShaderSource);
var fragmentShaderEncoded = createShader(glEncoded, glEncoded.FRAGMENT_SHADER, fragmentShaderSourceEncoded);

var program = createProgram(gl, vertexShader, fragmentShader);
var programEncoded = createProgram(glEncoded, vertexShaderEncoded, fragmentShaderEncoded);

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

//copy data from webgl canvas to 2d canvas
function mapRender() {
    render(document.getElementById('clipCanvas'), gl, program);
    let canvas2 = document.getElementById('testCanvas');
    let ctx2 = canvas2.getContext('2d');
    ctx2.clearRect(0,0,canvas2.width,canvas2.height);
    ctx2.drawImage(gl.canvas,0,0);   
}

//function that renders to webgl canvas
function render(canvas, gl, program) {

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

    var positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    setRectangle(gl, 0, 0, canvas.width, canvas.height);

    //provide texture coordinates for the rectangle
    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);
    var canvases = [canvas, document.getElementById("colorCanvas")]
    var textures = []
    for (var ii=0; ii<2; ii++) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvases[ii]);
        textures.push(texture);
    }
    

    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    let width = gl.canvas.clientWidth;
    let height = gl.canvas.clientHeight;
    
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

    gl.enableVertexAttribArray(texcoordLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(texcoordLocation, size, type, normalize, stride, offset);

    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    var eonrLocation = gl.getUniformLocation(program, "eonr");
    var mLocation = gl.getUniformLocation(program,"m");
    var sithreshLocation = gl.getUniformLocation(program,"sithresh");
    var npreLocation = gl.getUniformLocation(program, "npre");

    gl.uniform1f(eonrLocation, modelvars.eonr);
    gl.uniform1f(mLocation, modelvars.m);
    gl.uniform1f(sithreshLocation, modelvars.sithresh);
    gl.uniform1f(npreLocation, modelvars.npre);

    //image location
    var u_image0Location = gl.getUniformLocation(program, "u_image0");
    var u_image1Location = gl.getUniformLocation(program, "u_image1");
    gl.uniform1i(u_image0Location, 0);
    gl.uniform1i(u_image1Location, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);

}

//set up canvases to render
function canvasWork(imageArray, numx, numy, testField, pixelTL) {
   
    const res = 256;
    let imgHeight = res*numy;
    let imgWidth = res*numx;
    let canvas = document.getElementById('testCanvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    let ctx = canvas.getContext('2d');
    let clipCanvas = document.getElementById('clipCanvas');
    clipCanvas.width = imgWidth;
    clipCanvas.height = imgHeight;
   
    let ctxclip = clipCanvas.getContext('2d');
    for (let i=0; i<imageArray.length; i++) {
       
        ctx.drawImage(imageArray[i], (i%numx)*res, Math.floor(i/numx)*res, res, res);
    }
    
    let fieldCoords; 
    ctx.strokeStyle = "#31eefd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctxclip.strokeStyle = "#ff0000";
    ctxclip.lineWidth = 2;
    ctxclip.beginPath();
    let fieldCoordsArray = testField.geometry.coordinates;
    if (testField.geometry.type=="Polygon" && fieldCoordsArray[0].length == 2) {
        
        fieldCoords = fieldCoordsArray;
        for (let i = 0; i < fieldCoords.length; i++) {
        let thisPixel = pixel(fieldCoords[i][0],fieldCoords[i][1]);
        
        if (i==0) {
            ctx.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        }
        else {
            ctx.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        } 
        }
        ctx.stroke();
    }
    else if (testField.geometry.type=="Polygon" && fieldCoordsArray[0].length > 2) {
       
        for (let j=0; j<fieldCoordsArray.length; j++) {
        fieldCoords = fieldCoordsArray[j]; 
        for (let i = 0; i < fieldCoords.length; i++) {
        let thisPixel = pixel(fieldCoords[i][0],fieldCoords[i][1]);
        
        if (i==0) {
            ctx.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        }
        else {
            ctx.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        } 
        }
        ctx.stroke();
        }
    }
   else {
       
        for (let j=0; j<fieldCoordsArray[0].length; j++) {
        fieldCoords = fieldCoordsArray[0][j]; 
        for (let i = 0; i < fieldCoords.length; i++) {
        let thisPixel = pixel(fieldCoords[i][0],fieldCoords[i][1]);
        
        if (i==0) {
            ctx.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.moveTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        }
        else {
            ctx.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
            ctxclip.lineTo(thisPixel[0]-pixelTL[0], thisPixel[1]-pixelTL[1]);
        } 
        }
        ctx.stroke();
        }
    }

    ctxclip.clip("evenodd");
   
    for (let i=0; i<imageArray.length; i++) {
        ctxclip.drawImage(imageArray[i], (i%numx)*res, Math.floor(i/numx)*res, res, res);
    }
    
    webglCanvas.width = imgWidth;
    webglCanvas.height = imgHeight;
    webglCanvasEncoded.width = imgWidth;
    webglCanvasEncoded.height = imgHeight;
    
    render(clipCanvas, gl, program);
    render(clipCanvas, glEncoded, programEncoded);

     //update coordinates for overlay
     let mySource = page.mapOutput.getSource('canvas-source');
     mySource.setCoordinates(page.coords);

    mapRender();
}

//given field data, load the png data for SI
async function loadFieldData(testField) {
    let  auth = await authentication;
   
    let testBbox = turf.bbox(testField);
    page.mapOutput.fitBounds(testBbox);
    let cornerTiles = returnTiles(testBbox);
    
    let minx = Math.floor(cornerTiles[0][0]);
    let maxx = Math.floor(cornerTiles[1][0]);
    let miny = Math.floor(cornerTiles[1][1]);
    let maxy = Math.floor(cornerTiles[0][1]);

    let minxAbs = Math.floor(cornerTiles[0][0]);
    let maxxAbs = Math.ceil(cornerTiles[1][0]);
    let minyAbs = Math.floor(cornerTiles[1][1]);
    let maxyAbs = Math.ceil(cornerTiles[0][1]);

    let rangex = range(0, maxx-minx+1, 1);
    let rangey = range(0, maxy-miny+1, 1);

    let tilex = Math.floor(cornerTiles[0][0]);
    let tiley = Math.floor(cornerTiles[1][1]);
    
    let top = tiley;
    let left = tilex;
    let topLeft = lonlat(left,top);
    
    let pixelTL = pixel(topLeft[0], topLeft[1]);

    page.cornerTiles = cornerTiles;
    
    let tileBucket = new AWS.S3({params: {Bucket: "pagaf.nltgis.com"} });
    tileBucket.config.credentials = auth.awsCredentials;

    let imageUrls = [];
    for (let j=0; j<rangey.length; j++) {
        for (let i=0; i<rangex.length; i++) {
            imageUrls.push('r/corn/si/current/14/'+(minx+rangex[i])+'/'+(miny+rangey[j])+'.png');
        }
    }

    let imagesLoaded = 0;
    let totalImages = imageUrls.length;
    let imageArray = new Array(totalImages);
    for (let i=0; i<imageUrls.length; i++) {
        tileBucket.getObject({Key:imageUrls[i]}, function (err, data) {
            
            let encoded = encode(data.Body);
            let thisImage = document.createElement('img');
            thisImage.id = "image"
            imageArray[i]=thisImage;
            imageArray[i].onload=function() {
               
            imagesLoaded += 1;
            
            if (imagesLoaded == totalImages) {
                page.coords = [
                    lonlat(minxAbs,minyAbs),
                    lonlat(maxxAbs,minyAbs),
                    lonlat(maxxAbs,maxyAbs),
                    lonlat(minxAbs,maxyAbs)
                ];
                
                canvasWork(imageArray, rangex.length, rangey.length, testField, pixelTL);
            }
            }
            imageArray[i].src = 'data:image/png;base64,' + encoded;
        })
        
    }
}

//update blue field outlines in side menu
function updateFieldDivs() {
    
    var fieldDivs = d3.select('#selectedFields').selectAll("svg").data(user.fields.features);
        fieldDivs.exit().remove();
        fieldDivs.each(function(d,i) {
                    
                    let el = d3.select(this);
                    let rect=el.node().getBoundingClientRect();
                    let width = rect.width;
                    let height = rect.height;
                    let geojson = blank();
                    geojson.features.push(d);
                    let projection = d3.geoMercator().fitExtent([[5,5],[width-5, height-5]], geojson);
                    let path = d3.geoPath().projection(projection);
                    //no need to enter on existing
                    el.select("g").selectAll("path")
                        .data(geojson.features)
                        .attr("d",path)
                        .style("fill","none")
                        .style("stroke-width",3);
        })

        var fieldSvgs = fieldDivs.enter().append("svg")
            .attr("class","fieldSvg")
            .attr("id", function(d) {
               
                return "id"+d.properties.T_INDEX;
            })
            .on("click", function(d) {
                if (page.tab=="ModelSelection") {
                    d3.select("#selectedFields").selectAll("svg").classed("svgSelected",false);
                    d3.select(this).classed("svgSelected",true);
                    d3.select("#webglContainer").classed("hidden", false);
                    loadFieldData(d);
                }
                else {
                    d3.select("#selectedFields").selectAll("svg").classed("svgSelected",false);
                }
                
            });
        var fieldGs = fieldSvgs
            .append("g");

        fieldSvgs.each(function(d) {
            let el = d3.select(this);
            let rect=el.node().getBoundingClientRect();
            let width = rect.width;
            let height = rect.height;
            let geojson = blank();
            geojson.features.push(d);
            let projection = d3.geoMercator().fitExtent([[5,5],[width-5, height-5]], geojson);
            let path = d3.geoPath().projection(projection);
            el.select("g").selectAll("path")
                .data(geojson.features)
                .enter()
                .append("path")
                .attr("d",path)
                .style("fill","none")
                .style("stroke-width",3);
        })
}

//load field from AWS
async function loadFieldManagement() {
    hideAll();
    d3.select("#webglContainer").classed("hidden",true);
    d3.select("#selectedFields").selectAll("svg").classed("svgSelected",false);
    d3.select("#mapContainer").style('display', 'inline-block');
    page.map.resize();
    let config = await (await fetch('/config.json')).json();
    let  auth = await authentication;
    let home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });
    let userId = (await auth.auth0.getIdTokenClaims()).sub;

    try {
        let d = await getJSON("fields/fields.json")
        user.fields = JSON.parse(d.Body.toString('utf-8'));
    }
    catch (e) {
        if (e.code == 'NoSuchKey') {
            console.log('fields.json not found. Saving empty fields list.')
            user.fields = blank()
            await savePolygons()
        }
        else
            throw e
    }

    if (user.fields.features.length) {
        page.map.getSource('userFields').setData(user.fields);
        updateFieldDivs();
        fitUserFieldsBounds()
    }
}

function fitUserFieldsBounds() {
    let bbox = turf.bbox(user.fields);
    page.box = [[bbox[0],bbox[1]],[bbox[2],bbox[3]]];

    //only zoom to field bounds on page load
    if (page.iLoad == 1) {
        page.map.fitBounds(page.box);
        page.iLoad = 0;
        var objDiv = document.getElementById("selectedFields");
        objDiv.scrollTop = objDiv.scrollHeight;
    } 
}

function updateFields() {
    var data = page.draw.getAll();
}

var fields = [];
var loaded = 0;

mapboxgl.accessToken = 'pk.eyJ1IjoiY2Vuc3VzcGFnYWYiLCJhIjoiY2tid2FjZmxxMDZoczJycGtxNmthamNrYyJ9.g9IGWfD-Nz9waQzHT5klkg'
 //initialize map
async function initializeMap() {
    await authentication;
    var map = new mapboxgl.Map({
            container: 'tiles', // container id
            style: 'mapbox://styles/censuspagaf/ckbwcdt9h0k3e1iplxvtr36vx',
            center: [-93.5, 37.5], // starting position
            zoom: 3, // starting zoom
            maxZoom:15
        });

    page.map = map;

    var mapOutput = new mapboxgl.Map({
        container: 'mapOutput', // container id
        style: 'mapbox://styles/censuspagaf/ckbwcdt9h0k3e1iplxvtr36vx',
        center: [-93.5, 37.5], // starting position
        zoom: 3, // starting zoom
        maxZoom:15
    });

    page.mapOutput = mapOutput;

    mapOutput.on("load", function() {
        document.body.removeAttribute('aria-busy')
        mapOutput.resize();

        //only add layer if it isn't yet added
        let myLayer = page.mapOutput.getLayer('canvas-layer');
        if (typeof myLayer === 'undefined') {
           
            //canvas overlay for field
            page.mapOutput.addSource('canvas-source', {
                type:'canvas',
                canvas:'testCanvas',
                //values from mapbox example. Have to have some coordinates to add layer successfully
                coordinates:[
                    [91.4461, 21.5006],
                    [100.3541, 21.5006],
                    [100.3541, 13.9706],
                    [91.4461, 13.9706]
                    ],
                animate:true
            })
            
            page.mapOutput.addLayer({
                id:'canvas-layer',
                type:'raster',
                source:'canvas-source'
            })
        }
        
    })
     

    var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
    polygon: true,
    trash: true
    }
    });
    page.draw = draw;
    map.addControl(draw, 'bottom-left');
    //pattern to do things on drawing actions. Not used
    map.on('draw.create', updateFields);
    map.on('draw.delete', updateFields);
    map.on('draw.update', updateFields);

    //a lot of things wait until map loads to happen
    map.on('load', function() {
   ////was clu tiles
   // map.addSource('ia', {
   //         id:'fields',
   //         type:'vector',
   //         "metadata": {
   //         "mapbox:autocomposite": true
   //         },
   //         'maxzoom':11,
   //         tiles:["http://localhost:8080/data/ia/{z}/{x}/{y}.pbf"]
   //     });

   //Carl's tiles
   map.addSource('ia', {
    id:'fields',
    type:'vector',
    "metadata": {
    "mapbox:autocomposite": true
    },
    'maxzoom':15,
    tiles:[window.origin+'/data/tiles/{z}/{x}/{y}.pbf']
    });

    //NAIP
    map.addSource(
        'naip',
        {'type': 'raster',
        'tiles': [
            window.origin+'/data/naip_tiles/{z}/{x}/{y}.png'
        ],
        'tileSize': 256
    }
    )

    d3.json('data/adair.geojsonl.json', function(error, data) {
        if (error){
            console.log(error);
        }
        else {
            map.addSource('countySource', {
                    'type':'geojson',
                    'data':data
                })

            map.addLayer({
                'id':'county',
                'type':'fill',
                'source':'countySource',
                'layout': {
            'visibility':'visible'
            },
            'paint':{
            'fill-outline-color':'#fff',
            'fill-color':'rgba(0,0,0,0)'
        }
            })
            let bbox = turf.bbox(data);
       
            page.box = [[bbox[0],bbox[1]],[bbox[2],bbox[3]]];
            map.fitBounds(page.box);
        }
    })

    map.addSource('outlineSource', {
                    'type':'geojson',
                    'data':blank()
                })
    map.addSource('userFields', {
        'type':'geojson',
        'data':blank()
    })

    // map.addLayer({
    //     'id':'polys',
    //     'maxzoom': 16,
    //     'type':'fill',
    //     'source':'ia',
    //     'source-layer':'ia',
    //     'layout': {
    //         'visibility':'visible'
    //     },
    //     //  'paint': {
    //     //      'fill-color': [
    //     //          'interpolate',
    //     //          ['linear'],
    //     //          ['get','CALCACRES'],
    //     //          0,
    //     //          '#9EFFA0',
    //     //          500,
    //     //          '#00610F'
    //     //      ],
    //     //      'fill-opacity':0.8
    //     //  }
    //     'paint':{
    //         'fill-outline-color':'#fff',
    //         'fill-color':'rgba(0,0,0,0)'
    //     }
    // },"aerialway")

    map.addLayer({
        'id':'polys',
        'maxzoom': 15,
        'type':'fill',
        'source':'ia',
        'source-layer':'singlepoly',
        'layout': {
            'visibility':'visible'
        },
        'paint':{
            'fill-outline-color':'#fff',
            'fill-color':'rgba(255,255,0,0.3)'
        }
    },"aerialway")

    map.addLayer({

        'id': 'simple-tiles',
        'type': 'raster',
        'source': 'naip',
        'minzoom': 2,
        'maxzoom': 18
                    
        }, "tunnel-street-minor-low")
    

    map.addLayer({
        'id':'userFields',
        'type':'fill',
        'source':'userFields',
        'layout': {
            'visibility':'visible'
        },
        'paint':{
            'fill-color':'#31eefd',
            'fill-opacity':0.8,
            'fill-outline-color':'#000'
        }
    },'aerialway')

    map.addLayer({
        'id':'outline',
        'type':'fill',
        'source':'outlineSource',
        'layout': {
            'visibility':'visible'
        },
        'paint':{
        'fill-color':'#ffffff'
        }
    },'aerialway')
    
    loadView('FieldManagement');
    document.body.removeAttribute('aria-busy')
    map.resize();
    function sourceCallback() {
                    
        if (map.getSource('ia') && map.isSourceLoaded('ia')) {
            loaded = 1;
            //setColor();
            map.off('sourcedata',sourceCallback);
        }
    }
    map.on('mousemove', 'polys', function(e) {
        //var geom = blank();
        //geom['features'] = [e.features[0].geometry];
        //map.getSource('outlineSource').setData(e.features[0].geometry);
        var toMatch = e.features[0].properties['T_INDEX'];
        
        var latLon = e.lngLat.wrap();
        var lat = latLon.lat;
        var lon = latLon.lng;
        var sw = [
            lon-0.005,
            lat-0.005
        ]
        var ne = [
            lon+0.005,
            lat+0.005
        ]
            
        var swProject = map.project(sw);
        var neProject = map.project(ne);
        var features = map.queryRenderedFeatures([swProject,neProject], {
            layers:['polys']
        });

        toDissolve = blank();
        for (let i=0; i<features.length; i++) {
            
            if (features[i]['properties']['T_INDEX'] == toMatch) {
                toDissolve.features.push({
                    type:'Feature',
                    geometry:features[i].geometry,
                    properties:{'T_INDEX':toMatch}
                })
            }
        }

        fullGeom = turf.dissolve(toDissolve, {propertyName:'T_INDEX'});
        map.getSource('outlineSource').setData(fullGeom);
        page.mouseoverField = fullGeom;

    });
    map.on('mouseenter','polys',function(e) {
                    map.getCanvas().style.cursor = 'pointer';
                })
                map.on('mouseleave', 'polys', function(e) {
                     map.getCanvas().style.cursor = '';
                 })
                 map.on('mouseenter','outline',function(e) {
                    map.getCanvas().style.cursor = 'pointer';
                })
                map.on('mouseleave', 'outline', function(e) {
                     map.getCanvas().style.cursor = '';
                     map.getSource('outlineSource').setData(blank());
                 })
                
    map.on('sourcedata', sourceCallback);
    map.on('click', function(e) {
                
                var layers = map.queryRenderedFeatures(e.point);

                for (var i = 0; i<layers.length; i++) {
                     if (layers[i]['layer']['id'] == 'polys' && page.mouseoverField != null) {
                         var beforeSize = user.fields.features.length;
                         var filtered = user.fields.features.filter(function(d) {
                             return d.properties['T_INDEX'] != layers[i].properties['T_INDEX'];
                         })

                         var afterSize = filtered.length;
        
                         if (beforeSize != afterSize) {
                            user.fields.features = filtered;
                         }
                         else {
                            user.fields.features.push(page.mouseoverField.features[0]);
                         }  
                     }
                    }

                var fieldDivs = d3.select('#selectedFields').selectAll('svg').data(user.fields.features);
                fieldDivs.exit().remove();
                fieldDivs.each(function(d,i) {
                    let el = d3.select(this);
                    let rect=el.node().getBoundingClientRect();
                    let width = rect.width;
                    let height = rect.height;
                    let geojson = blank();
                    geojson.features.push(d);
                    let projection = d3.geoMercator().fitExtent([[5,5],[width-5, height-5]], geojson);
                    let path = d3.geoPath().projection(projection);
                    //no need to enter on existing
                    el.select("g").selectAll("path")
                        .data(geojson.features)
                        .attr("d",path)
                        .style("fill","none")
                        .style("stroke-width",3);
                })
                
                var fieldSvgs = fieldDivs.enter().append("svg")
                .attr("class","fieldSvg")
                .attr("id", function(d) {
                    return "id"+d.properties.T_INDEX;
                })
                .on("click", function(d) {
                if (page.tab=="ModelSelection") {
                    d3.select("#selectedFields").selectAll("svg").classed("svgSelected",false);
                    d3.select(this).classed("svgSelected",true);
                    d3.select("#webglContainer").classed("hidden", false);
                    loadFieldData(d);
                }
                else {
                    d3.select("#selectedFields").selectAll("svg").classed("svgSelected",false);
                }
                
            });
                var fieldGs = fieldSvgs
                    .append("g");
                    //on new elements, need to append "path"
                    fieldSvgs.each(function(d) {
                    let el = d3.select(this);
                    let rect=el.node().getBoundingClientRect();
                    let width = rect.width;
                    let height = rect.height;
                    let geojson = blank();
                    geojson.features.push(d);
                    let projection = d3.geoMercator().fitExtent([[5,5],[width-5, height-5]], geojson);
                    let path = d3.geoPath().projection(projection);
                    el.select("g").selectAll("path")
                        .data(geojson.features)
                        .enter()
                        .append("path")
                        .attr("d",path)
                        .style("fill","none")
                        .style("stroke-width",3);
                })

                
                var objDiv = document.getElementById("selectedFields");
                objDiv.scrollTop = objDiv.scrollHeight;
        
                var updated = blank();
                updated.features = user.fields.features;
                map.getSource('userFields').setData(updated);
            })
    
})

}

function download(d) {
    let el = document.getElementById("webglContainer");
    let hidden = el.classList.contains("hidden");
	console.log('hidden',hidden);
    //if container is hidden, don't allow data processing
    //User must click field first
    if (hidden) {
        return;
    }
    decode(glEncoded);
}

//for sencha wrapper
window.loadView = loadView;
window.download = download;
window.setPre = setPre;

initializeMap();

})()