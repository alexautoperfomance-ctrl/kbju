// node: загрузить индекс и ВСЕ данные сетей/магазинов из cdata/ (в браузере — лениво)
const fs=require('fs'),path=require('path'); const D=path.join(__dirname,'..','cdata');
global.self=global; require(path.join(D,'idx.js')); const P=require('../parser.js');
for(const m of self.CHAIN_IDX) P.chainAdd(m,m.f.map(f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'))));
module.exports=P;
