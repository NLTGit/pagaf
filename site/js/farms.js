;(async function () {
'use strict'

//define user data
function User() {
    this.organization = null;
    this.fields = [];
}

//variables for shader program
function modelVars() {
    this.eonr = 130.0;
    this.m = 0;
    this.sithresh = 0.7;
}

//maintain "global" values
function pageState() {
    this.tab = 'FieldManagement',
    this.mouseoverField = null;
    this.iLoad = 1;
    this.map = null;
    this.editing = [];
}

//map layer names
var layers = [
    'userFields',
    'outline',
    'county'
    //'polys'
]

var  user = new User();
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
    var promise = home.putObject({
        Key:userId+"/"+key,
        Body:JSON.stringify(object),
        ContentType: "application/json"}).promise();

    return promise;
}

//load json object from bucket
async function getJSON(key) {
    let config = await (await fetch('/config.json')).json();
    let auth = await authentication;
    var home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });

    let userId = (await auth.auth0.getIdTokenClaims()).sub;
   
    home.config.credentials = auth.awsCredentials;
    var objReturn = home.getObject({
        Key:userId+"/"+key,
    });

    var promise = objReturn.promise();
   
    return promise;
}

//save polygons drawn on map to bucket
function savePolygons() {
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

//***************************************
//End functions that contact bucket
//***************************************


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


//To generate sliders
function Slider(id, field, domain) {
    var self=this;
    this.margin = {right:25, left:25};
    this.selection = d3.select("#"+id);
    this.selection.append("text")
    .attr("x",2)
    .attr("y",12)
    .text(field);
    this.hue = function(h) {
        modelvars[field] = h;
        self.handle.attr("cx", self.x(h));
        render(document.getElementById('clipCanvas'));
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
    d3.select("#modelContainer").style('display','inline-block');
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

    
    gl.deleteProgram(program);
}

let webglCanvas = document.getElementById('webglCanvas');
let gl = webglCanvas.getContext("webgl");
if (!gl) {
    console.log("initialization of webgl was bad");
}


//Much of the webgl related code is from webglfundamentals, created by
//Gregg Tavares
var vertexShaderSource = document.getElementById('vertex-shader').text;
var fragmentShaderSource = document.getElementById('fragment-shader').text;

//create shaders
var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

var program = createProgram(gl, vertexShader, fragmentShader);

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

//function that renders to webgl canvas
function render(canvas) {
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

    gl.uniform1f(eonrLocation, modelvars.eonr);
    gl.uniform1f(mLocation, modelvars.m);
    gl.uniform1f(sithreshLocation, modelvars.sithresh);

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
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    let fieldCoords; 
    ctx.strokeStyle = "#31eefd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctxclip.strokeStyle = "#ff0000";
    ctxclip.lineWidth = 2;
    ctxclip.beginPath();
    fieldCoordsArray = testField.geometry.coordinates;
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
    let clipimageData = ctxclip.getImageData(0, 0, clipCanvas.width, clipCanvas.height);
    
    
    webglCanvas.width = imgWidth;
    webglCanvas.height = imgHeight;
    
    render(clipCanvas);
}

//given field data, load the png data for SI
async function loadFieldData(testField) {
    let  auth = await authentication;
   
    let testBbox = turf.bbox(testField);
    
    let cornerTiles = returnTiles(testBbox);
    
    let minx = Math.floor(cornerTiles[0][0]);
    let maxx = Math.floor(cornerTiles[1][0]);
    let miny = Math.floor(cornerTiles[1][1]);
    let maxy = Math.floor(cornerTiles[0][1]);

    let rangex = range(0, maxx-minx+1, 1);
    let rangey = range(0, maxy-miny+1, 1);

   

    let tilex = Math.floor(cornerTiles[0][0]);
    let tiley = Math.floor(cornerTiles[1][1]);
    let top = tiley;
    let left = tilex;
    let topLeft = lonlat(left,top);
    
    let pixelTL = pixel(topLeft[0], topLeft[1]);
    
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
    let config = await (await fetch('/config.json')).json();
    let  auth = await authentication;
    let home = new AWS.S3({params: {Bucket: config.aws.homeBucket} });
    let userId = (await auth.auth0.getIdTokenClaims()).sub;

    getJSON("fields/fields.json").then(function(d) {
        let data = JSON.parse(d.Body.toString('utf-8'));
        page.map.getSource('userFields').setData(data);
        let bbox = turf.bbox(data);
       
        page.box = [[bbox[0],bbox[1]],[bbox[2],bbox[3]]];

        user.fields = data;
        updateFieldDivs();
        //only zoom to field bounds on page load
        if (page.iLoad == 1) {
            page.map.fitBounds(page.box);
            page.iLoad = 0;
            var objDiv = document.getElementById("selectedFields");
            objDiv.scrollTop = objDiv.scrollHeight;
        } 
    })
    .catch(function(d) {
        console.log("error",d);
        user.fields = blank();
    });
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

initializeMap();

})()
