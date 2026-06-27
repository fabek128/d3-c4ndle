function setLineStem(lineStem, scalex, scaley, width, dataLength){
    lineStem.attr("class", "stem")
      .attr("x1", function(d) { return scalex(d.timestamp) + 0.4 * (width - 2 * margin)/ dataLength;})
      .attr("x2", function(d) { return scalex(d.timestamp) + 0.4 * (width - 2 * margin)/ dataLength;})        
      .attr("y1", function(d) { return scaley(d.high);})
      .attr("y2", function(d) { return scaley(d.low); })
      .attr("stroke", function(d){ return d.open > d.close ? "red" : "green"; });
}

function generateRect(rect, scalex, scaley, width, dataLength){
  var realWidth = (width - (2*margin) - margin_right);

  rect.attr("x", function(d) { return scalex(d.timestamp); })
      .attr("y", function(d) { return scaley(max(d.open, d.close));})     
      .attr("height", function(d) { 
                  return scaley((d.open === d.close) ? min(d.open + 0.001, d.close) : min(d.open, d.close))
                        -scaley((d.open === d.close) ? max(d.open + 0.001, d.close) : max(d.open, d.close));
                      })
      .attr("width", function(d) { 
        return Math.floor(0.8 * realWidth/dataLength); }) 
      .attr("stroke", function(d){ return d.open > d.close ? "red" : "green"; })
      .attr("fill",function(d) { 
        if(parseInt(d.open) === parseInt(d.close)){
          return "black";
        }else if(d.open > d.close){
          return "red";
        }else {
          return "green";
        }
      });
}


function genCandleChartSvg(svg, dd){
  var tempData = getData(dd.window);
  var data = tempData.data;
  var orderBookData = tempData.orderBookData;

  var minValue = d3.min(data.map(function(x) {return x["low"];})) - 6;
  var maxValue = d3.max(data.map(function(x) {return x["high"];})) + 6;

  var tempCandleWidth = (dd.width-margin-margin_right) / data.length;

  dd.y = d3.scale.linear()
          .domain([minValue, maxValue])
          .range([dd.height-margin, margin]);
  dd.x = d3.scale.linear()
          .domain([d3.min(data.map(function(d){return d.timestamp;})),
           d3.max(data.map(function(d){return d.timestamp;}))])
          .range([margin,dd.width-margin-margin_right-tempCandleWidth]);
  
  var chart = d3.select(svg);

  var textYrule = chart.selectAll("text.yrule").data(dd.y.ticks(dd.ticks));
  setTextyrule(textYrule, dd.y, dd.width - margin_right + 14);          
  setTextyrule(textYrule.enter().append("svg:text"), dd.y, dd.width - margin_right + 14);
  textYrule.exit().remove();

  var lineStem = chart.selectAll("line.stem")
                  .data(data);
  setLineStem(lineStem, dd.x, dd.y, dd.width, data.length);
  setLineStem(lineStem.enter().append("svg:line"), dd.x, dd.y, dd.width, data.length);
  lineStem.exit().remove();

  var rect = chart.selectAll("rect")
              .data(data);

  generateRect(rect, dd.x, dd.y, dd.width, data.length);        
  generateRect(rect.enter().append("svg:rect"), dd.x, dd.y, dd.width, data.length);
  rect.exit().remove();     
  setLineBorder(chart);

  setMouseEvent(chart, dd.y, dd.x);

  setCurrentValue(chart, dd.y, dd.x);

}


function generateOrderBookRect(rect, scalex, scaley, width, dataLength){
  rect.attr("x", function(d) { return scalex(dateFormat.parse(d.Date).getTime()); })
      .attr("y", function(d) {return scaley(max(0, d.Volume));})     
      .attr("height", function(d) { return scaley(0) - scaley(d.Volume);})
      .attr("width", function(d) { return 0.5 * (width - 2*margin)/dataLength; })
      .attr("stroke", function(d){ return d.open > d.close ? "red" : "green"; })
      .attr("fill",function(d) { return d.open > d.close ? "red" : "green" ;});
}