const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class MockPath2D {
  constructor(){ this.points = []; }
  moveTo(x, y){ this.points.push({x, y}); }
  lineTo(x, y){ this.points.push({x, y}); }
}

class MockContext {
  constructor(){ this.lineWidth = 1; }
  save(){}
  restore(){}
  lineCap = 'butt';
  lineJoin = 'miter';
  isPointInStroke(path, x, y){
    for(let i=0;i<path.points.length-1;i++){
      const p1 = path.points[i];
      const p2 = path.points[i+1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx*dx + dy*dy;
      let t = ((x - p1.x)*dx + (y - p1.y)*dy) / (len2||1);
      t = Math.max(0, Math.min(1, t));
      const px = p1.x + t*dx;
      const py = p1.y + t*dy;
      const dist = Math.hypot(x - px, y - py);
      if(dist <= this.lineWidth/2) return true;
    }
    return false;
  }
}

global.Path2D = MockPath2D;
global.OffscreenCanvas = class{ getContext(){ return new MockContext(); } };
function createElement(){
  return {
    getContext: () => new MockContext(),
    style: {},
    appendChild(){},
  };
}
global.document = {
  createElement,
  getElementById: () => null,
  body: { appendChild(){} }
};
global.window = global;
global.applyViewTransform = () => {};

const code = fs.readFileSync(path.join(__dirname, '../docs/js/tools.js'), 'utf8');
vm.runInThisContext(code);

global.viewScale = 1;
global.panX = 0;
global.panY = 0;
global.imgW = 0;
global.imgH = 0;
global.view = { width:200, height:200, getBoundingClientRect: () => ({ left:0, top:0 }) };
global.layers = [
  { visible:true, thickness:2, segments:[{ points:[{x:0,y:0},{x:100,y:0}] }] }
];
global.symbols = [];
global.annotations = [];
global.config = { snapToGrid:false, gridSize:10 };

let hit = hitTestSegment(50,0);
assert.deepStrictEqual(hit, { layer:0, index:0 });

hit = hitTestSegment(150,50);
assert.strictEqual(hit, null);

console.log('hitTestSegment tests passed');
