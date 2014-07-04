function generateVolRect(rect, scalex, scaley, width, dataLength){
  var realWidth = (width - (2*margin) - margin_right);

  rect.attr("x", function(d) { return scalex(d.timestamp); })
      .attr("y", function(d) {return scaley(max(0, d.volume));})     
      .attr("height", function(d) { return scaley(0) - scaley(d.volume);})
      .attr("width", function(d) { return Math.floor(0.8 * realWidth/dataLength); })
      .attr("stroke", function(d){ return d.open > d.close ? "red" : "green"; })
      .attr("fill",function(d) { return d.open > d.close ? "red" : "green" ;});
}

function genVolumeChartSvg(svg, dd){
  var data = getData(dd.window).data;       

  var tempCandleWidth = (dd.width-margin-margin_right) / data.length;

  dd.y = d3.scale.linear()
          .domain([0, d3.max(data.map(function(x){ return x["volume"];}))])
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

  var rect = chart.selectAll("rect")
              .data(data);
  generateVolRect(rect, dd.x, dd.y, dd.width, data.length);        
  generateVolRect(rect.enter().append("svg:rect"), dd.x, dd.y, dd.width, data.length);
  rect.exit().remove();
        
  setLineBorder(chart);

  setMouseEvent(chart, dd.y, dd.x);
}
