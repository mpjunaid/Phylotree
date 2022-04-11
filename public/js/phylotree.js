(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('underscore'), require('lodash')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'underscore', 'lodash'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.phylotree = global.phylotree || {}, global.d3, global._, global._$1));
}(this, (function (exports, d3, _, _$1) { 'use strict';

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var d3__namespace = /*#__PURE__*/_interopNamespace(d3);
var ___namespace = /*#__PURE__*/_interopNamespace(_);

function isLeafNode(node) {
  return !___namespace.has(node, "children")
}

function clearInternalNodes(respect) {
  if (!respect) {
    this.nodes.each(d => {
      if (!isLeafNode(d)) {
        d[this.selection_attribute_name] = false;
        if(!d.data.traits) {
          d.data.traits = {};
        }
        d.data.traits[this.selection_attribute_name] = d[this.selection_attribute_name];
      }
    });
  }
}

var node_operations = /*#__PURE__*/Object.freeze({
  __proto__: null,
  isLeafNode: isLeafNode,
  clearInternalNodes: clearInternalNodes,
  selectAllDescendants: selectAllDescendants
});

function newickParser(nwk_str, options={}) {
  const int_or_float = /^-?\d+(\.\d+)?$/;
  let left_delimiter = options.left_delimiter ||  '{',
  right_delimiter = options.right_delimiter ||  '}';
  let clade_stack = [];
  function addNewTreeLevel() {
    let new_level = {
      name: null
    };
    let the_parent = clade_stack[clade_stack.length - 1];
    if (!("children" in the_parent)) {
      the_parent["children"] = [];
    }
    clade_stack.push(new_level);
    the_parent["children"].push(clade_stack[clade_stack.length - 1]);
    clade_stack[clade_stack.length - 1]["original_child_order"] = the_parent["children"].length;
  }
  function finishNodeDefinition() {
    let this_node = clade_stack.pop();
    this_node["name"] = current_node_name;
    if ("children" in this_node) {
      this_node["bootstrap_values"] = current_node_name;
    } else {
      this_node["name"] = current_node_name;
    }
    this_node["attribute"] = current_node_attribute;
    if(left_delimiter == "[" && current_node_annotation.includes("&&NHX")) {
      current_node_annotation
        .split(':')
        .slice(1)
        .forEach(annotation => {
          const [key, value] = annotation.split('=');
          this_node[key] = int_or_float.test(value) ? +value : value;
        });
    } else {
      this_node["annotation"] = current_node_annotation;
    }
    current_node_name = "";
    current_node_attribute = "";
    current_node_annotation = "";
  }
  function generateError(location) {
    return {
      json: null,
      error:
        "Unexpected '" +
        nwk_str[location] +
        "' in '" +
        nwk_str.substring(location - 20, location + 1) +
        "[ERROR HERE]" +
        nwk_str.substring(location + 1, location + 20) +
        "'"
    };
  }
  let automaton_state = 0;
  let current_node_name = "";
  let current_node_attribute = "";
  let current_node_annotation = "";
  let quote_delimiter = null;
  let name_quotes = {
    "'": 1,
    '"': 1
  };
  let tree_json = {
    name: "root"
  };
  clade_stack.push(tree_json);
  var space = /\s/;
  for (var char_index = 0; char_index < nwk_str.length; char_index++) {
    try {
      var current_char = nwk_str[char_index];
      switch (automaton_state) {
        case 0: {
          // look for the first opening parenthesis
          if (current_char == "(") {
            addNewTreeLevel();
            automaton_state = 1; // expecting node name
          }
          break;
        }
        case 1: // name
        case 3: {
          // branch length
          // reading name
          if (current_char == ":") {
            automaton_state = 3;
          } else if (current_char == "," || current_char == ")") {
            try {
              finishNodeDefinition();
              automaton_state = 1;
              if (current_char == ",") {
                addNewTreeLevel();
              }
            } catch (e) {
              return generateError(char_index);
            }
          } else if (current_char == "(") {
            if (current_node_name.length > 0) {
              return generateError(char_index);
            } else {
              addNewTreeLevel();
            }
          } else if (current_char in name_quotes) {
            if (
              automaton_state == 1 &&
              current_node_name.length === 0 &&
              current_node_attribute.length === 0 &&
              current_node_annotation.length === 0
            ) {
              automaton_state = 2;
              quote_delimiter = current_char;
              continue;
            }
            return generateError(char_index);
          } else {
            if (current_char == left_delimiter) {
              if (current_node_annotation.length) {
                return generateError(char_index);
              } else {
                automaton_state = 4;
              }
            } else {
              if (automaton_state == 3) {
                current_node_attribute += current_char;
              } else {
                if (space.test(current_char)) {
                  continue;
                }
                if (current_char == ";") {
                  // semicolon terminates tree definition
                  char_index = nwk_str.length;
                  break;
                }
                current_node_name += current_char;
              }
            }
          }
          break;
        }
        case 2: {
          // inside a quoted expression
          if (current_char == quote_delimiter) {
            if (char_index < nwk_str.length - 1) {
              if (nwk_str[char_index + 1] == quote_delimiter) {
                char_index++;
                current_node_name += quote_delimiter;
                continue;
              }
            }
            quote_delimiter = 0;
            automaton_state = 1;
            continue;
          } else {
            current_node_name += current_char;
          }
          break;
        }
        case 4: {
          // inside a comment / attribute
          if (current_char == right_delimiter) {
            automaton_state = 3;
          } else {
            if (current_char == left_delimiter) {
              return generateError(char_index);
            }
            current_node_annotation += current_char;
          }
          break;
        }
      }
    } catch (e) {
      return generateError(char_index);
    }
  }
  if (clade_stack.length != 1) {
    return generateError(nwk_str.length - 1);
  }
  return {
    json: tree_json,
    error: null
  };
}

function getNewick(annotator) {
  let self = this;
  if (!annotator) annotator = d => '';
  function nodeDisplay(n) {
    if (!isLeafNode(n)) {
      element_array.push("(");
      n.children.forEach(function(d, i) {
        if (i) {
          element_array.push(",");
        }
        nodeDisplay(d);
      });
      element_array.push(")");
    }
    if(n.data.name != 'root') {
      element_array.push(n.data.name);
    }
    element_array.push(annotator(n));
    let bl = self.branch_length_accessor(n);
    if (bl !== undefined) {
      element_array.push(":" + bl);
    }
  }
  let element_array = [];
  annotator = annotator || "";
  nodeDisplay(this.nodes);
  return element_array.join("")+";";
}

var format_registry = {
  nwk: newickParser,
  nhx: newickParser,
};
 
function preOrder(node, callback, backtrack) {
  let nodes = [node],
    children,
    i;

  while ((node = nodes.pop())) {
    if (!(backtrack && backtrack(node))) {
      callback(node), (children = node.children);
      if (children)
        for (i = children.length - 1; i >= 0; --i) {
          nodes.push(children[i]);
        }
    }
  }
  return node;
}

function hasBranchLengths() {
  let bl = this.branch_length;
  if (bl) {
    return ___namespace.every(this.nodes.descendants(), function(node) {
      return !node.parent || !___namespace.isUndefined(bl(node));
    });
  }
  return false;
}

function defBranchLengthAccessor(_node, new_length) {
  let _node_data = _node.data;
  if (
    "attribute" in _node_data &&
    _node_data["attribute"] &&
    _node_data["attribute"].length
  ) {
    if(new_length > 0) {
      _node_data["attribute"] = String(new_length);
    }
    let bl = parseFloat(_node_data["attribute"]);
    if (!isNaN(bl)) {
      return Math.max(0, bl);
    }
  }
  // Allow for empty branch length at root
  if(_node_data.name == "root") {
    return 0;
  }
  console.warn('Undefined branch length at ' + _node_data.name + '!');
  return undefined;
}

function setBranchLength(attr) {
  if (!arguments.length) return this.branch_length_accessor;
  this.branch_length_accessor = attr ? attr : defBranchLengthAccessor;
  return this;
}

function scale(scale_by) {
  let bl = this.branch_length;
  ___namespace.each(this.nodes.descendants(), (node) => {
    let len = bl(node);
    if(len) {
      bl(node, scale_by(len));
    }     
  });
  return this;
}

function reroot(node, fraction) {
  if(!(node instanceof d3__namespace.hierarchy)) {
    throw new Error('node needs to be an instance of a d3.hierarchy node!');
  }
  let nodes = this.nodes.copy();
  fraction = fraction !== undefined ? fraction : 0.5;
  if (node.parent) {
    var new_json = d3__namespace.hierarchy({
      name: "new_root"
    });  
    new_json.children = [node.copy()];
    new_json.data.__mapped_bl = undefined;
    nodes.each(n => {
      n.data.__mapped_bl = this.branch_length_accessor(n);
    });
    this.setBranchLength(n => {
      return n.data.__mapped_bl;
    });
    let remove_me = node,
    current_node = node.parent,
    stashed_bl = ___namespace.noop();
    let apportioned_bl =
    node.data.__mapped_bl === undefined ? undefined : node.data.__mapped_bl * fraction;
    stashed_bl = current_node.data.__mapped_bl;
    current_node.data.__mapped_bl =
      node.data.__mapped_bl === undefined
        ? undefined
        : node.data.__mapped_bl - apportioned_bl;
    node.data.__mapped_bl = apportioned_bl;
    var remove_idx;
    if (current_node.parent) {
      new_json.children.push(current_node);
      while (current_node.parent) {
        remove_idx = current_node.children.indexOf(remove_me);
        if (current_node.parent.parent) {
          current_node.children.splice(remove_idx, 1, current_node.parent);
        } else {
          current_node.children.splice(remove_idx, 1);
        }
        let t = current_node.parent.data.__mapped_bl;
        if (t !== undefined) {
          current_node.parent.data.__mapped_bl = stashed_bl;
          stashed_bl = t;
        }
        remove_me = current_node;
        current_node = current_node.parent;
      }
      remove_idx = current_node.children.indexOf(remove_me);
      current_node.children.splice(remove_idx, 1);
    } else {
      remove_idx = current_node.children.indexOf(remove_me);
      current_node.children.splice(remove_idx, 1);
      stashed_bl = current_node.data.__mapped_bl;
      remove_me = new_json;
    }
    // current_node is now old root, and remove_me is the root child we came up
    // the tree through
    if (current_node.children.length == 1) {
      if (stashed_bl) {
        current_node.children[0].data.__mapped_bl += stashed_bl;
      }
      remove_me.children = remove_me.children.concat(current_node.children);
    } else {
      let new_node = new d3__namespace.hierarchy({ name: "__reroot_top_clade", __mapped_bl: stashed_bl });
      ___namespace.extendOwn (new_json.children[0], node);
      new_node.data.__mapped_bl = stashed_bl;
      new_node.children = current_node.children.map(function(n) {
        n.parent = new_node;
        return n;
      });
      new_node.parent = remove_me;
      remove_me.children.push(new_node);
    }
  }
  // need to traverse the nodes and update parents
  this.update(new_json);
  this.traverse_and_compute(n => {
    ___namespace.each (n.children, (c) => {c.parent = n;});
  }, "pre-order");
  if(!___namespace.isUndefined(this.display)) {
    // get options
    let options = this.display.options;
    // get container
    d3__namespace.select(this.display.container).select('svg').remove();
    // retain selection
    let selectionName = this.display.selection_attribute_name;
    delete this.display;
    let rendered_tree = this.render(options);
    rendered_tree.selectionLabel(selectionName);
    rendered_tree.update();
    d3__namespace.select(rendered_tree.container).node().appendChild(rendered_tree.show());
    d3__namespace.select(this.display.container).dispatch('reroot');
  }
  return this;
}

function pathToRoot(node) {
  let selection = [];
  while (node) {
    selection.push(node);
    node = node.parent;
  }
  return selection;
}

var rooting = /*#__PURE__*/Object.freeze({
  __proto__: null,
  reroot: reroot,
  pathToRoot: pathToRoot
});

function xCoord(d) {
  return d.y;
}

function yCoord(d) {
  return d.x;
}

function radialMapper(r, a, radial_center) {
  return {
    x: radial_center + r * Math.sin(a),
    y: radial_center + r * Math.cos(a)
  };
}

function cartesianToPolar(
  node,
  radius,
  radial_root_offset,
  radial_center,
  scales,
  size) {
    node.radius = radius * (node.radius + radial_root_offset);
    node.angle = 2 * Math.PI * node.x * scales[0] / size[0];
    let radial = radialMapper(node.radius, node.angle, radial_center);
    node.x = radial.x;
    node.y = radial.y;
    return node;
  }

function drawArc(radial_center, points) {
  var start = radialMapper(points[0].radius, points[0].angle, radial_center),
  end = radialMapper(points[0].radius, points[1].angle, radial_center);
  return (
    "M " +
    xCoord(start) +
    "," +
    yCoord(start) +
    " A " +
    points[0].radius +
    "," +
    points[0].radius +
    " 0,0, " +
    (points[1].angle > points[0].angle ? 1 : 0) +
    " " +
    xCoord(end) +
    "," +
    yCoord(end) +
    " L " +
    xCoord(points[1]) +
    "," +
    yCoord(points[1])
  );
}

function arcSegmentPlacer(edge, where, radial_center) {
  var r = radialMapper(
    edge.target.radius + (edge.source.radius - edge.target.radius) * where,
    edge.target.angle,
    radial_center
  );
  return { x: xCoord(r), y: yCoord(r) };
}

var draw_line = d3__namespace
  .line()
  .x(function(d) {
    return xCoord(d);
  })
  .y(function(d) {
    return yCoord(d);
  })
  .curve(d3__namespace.curveStepBefore);

function lineSegmentPlacer(edge, where) {
  return {
    x:
      xCoord(edge.target) +
      (xCoord(edge.source) - xCoord(edge.target)) * where,
      y: yCoord(edge.target)
    };
}

function itemTagged(item) {
  return item.tag || false;
}

function itemSelected(item, tag) {
  return item[tag] || false;
}

/** Adjustment:
 * Nodes get a different color based on nodescores.
 * Branches get a different color based on nodescores.
 *  */ 
const css_classes = {
  "tree-container": "phylotree-container",
  "tree-scale-bar": "tree-scale-bar",
  clade: "clade",
  node: "node",
  "internal-node": "internal-node",
  "n01" : "n01",
  "n02" : "n02",
  "n03" : "n03",
  "n04" : "n04",
  "n05" : "n05",
  "n06" : "n06",
  "n07" : "n07",
  "n08" : "n08",
  "n09" : "n09",
  "n10" : "n10",
  "n1" : "n1",
  "root-node": "root-node",
  branch: "branch",
  "b01" : "b01",
  "b02" : "b02",
  "b03" : "b03",
  "b04" : "b04",
  "b05" : "b05",
  "b06" : "b06",
  "b07" : "b07",
  "b08" : "b08",
  "b09" : "b09",
  "b10" : "b10",
  "b1" : "b1",
  "tree-selection-brush": "tree-selection-brush",
};

function internalNames(attr) {
  if (!arguments.length) return this.options["internal-names"];
  this.options["internal-names"] = attr;
  return this;  
}

function radial(attr) {
  if (!arguments.length) return this.options["is-radial"];
  this.options["is-radial"] = attr;
  return this;
}

function alignTips(attr) {
  if (!arguments.length) return this.options["align-tips"];
  this.options["align-tips"] = attr;
  return this;
}

function nodeBubbleSize(node) {
  return this.options["draw-size-bubbles"]
  ? this.relative_nodeSpan(node) * this.scales[0] * 0.25
  : 0;
}

function selectionLabel(attr) {
  if (!arguments.length) return this.selection_attribute_name;
  this.selection_attribute_name = attr;
  this.syncEdgeLabels();
  return this;
}

var predefined_selecters = {
  all: d => {
    return true;
  },
  none: d => {
    return false;    
  },
  "all-leaf-nodes": d => {
    return isLeafNode(d.target);
  },
  "all-internal-nodes": d => {
    return !isLeafNode(d.target);
  }
};

var opt = /*#__PURE__*/Object.freeze({
  __proto__: null,
  css_classes: css_classes,
  internalNames: internalNames,
  radial: radial,
  alignTips: alignTips,
  nodeBubbleSize: nodeBubbleSize,
  selectionLabel: selectionLabel,
  predefined_selecters: predefined_selecters,
});

function shiftTip(d) {
  if (this.radial()) {
    return [
      (d.text_align == "end" ? -1 : 1) *
      (this.radius_pad_for_bubbles - d.radius),
      0
    ];
  }
  if (this.options["right-to-left"]) {
    return [this.right_most_leaf - d.screen_x, 0];
  }
  return [this.right_most_leaf - d.screen_x, 0];
}

/** Adjustment:
 * Nodes show the following information when hovering over them:
 * * Node score
 * * Depth
 * * Depth BCN
 *  */ 
function drawNode(container, node, transitions) {
  container = d3__namespace.select(container);
  var is_leaf = isLeafNode(node);
  if (is_leaf) {
    container = container.attr("data-node-name", node.data.name);
  }
  var labels = container.selectAll("text").data([node]),
  tracers = container.selectAll("line");
  if (is_leaf || (this.showInternalName(node) && !isNodeCollapsed(node))) {
    labels = labels
      .enter()
      .append("text")
      .classed(this.css_classes["node_text"], true)
      .merge(labels)
      .on("click", d=> {
        this.handle_node_click(d);
      })
      .attr("dy", d => {
        return this.shown_font_size * 0.33;
      })
      .text(d => {
        return this.options["show-labels"] ? this._nodeLabel(d) : "";
      })
      .style("font-size", d => {
        return this.ensure_size_is_in_px(this.shown_font_size);
      });
    if (this.radial()) {
      labels = labels
        .attr("transform", d => {
          return (
            this.d3PhylotreeSvgRotate(d.text_angle) +
            this.d3PhylotreeSvgTranslate(
              this.alignTips() ? this.shiftTip(d) : null
            )
          );
        })
        .attr("text-anchor", d => {
          return d.text_align;
        });
    } else {
      labels = labels.attr("text-anchor", "start").attr("transform", d => {
        if (this.options["layout"] == "right-to-left") {
          return this.d3PhylotreeSvgTranslate([-20, 0]);
        }
        return this.d3PhylotreeSvgTranslate(
          this.alignTips() ? this.shiftTip(d) : null
        );
      });
    }
    if (this.alignTips()) {
      tracers = tracers.data([node]);
      if (transitions) {
        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", d => {
            return (
              (d.text_align == "end" ? -1 : 1) * this.nodeBubbleSize(node)
            );
          })
          .attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("x2", d => {
            if (this.options["layout"] == "right-to-left") {
              return d.screen_x;
            }
            return this.shiftTip(d)[0];
          })
          .attr("transform", d => {
            return this.d3PhylotreeSvgRotate(d.text_angle);
          })
          .attr("x2", d => {
            if (this.options["layout"] == "right-to-left") {
              return d.screen_x;
            }
            return this.shiftTip(d)[0];
          })
          .attr("transform", d => {
            return this.d3PhylotreeSvgRotate(d.text_angle);
          });
      } else {
        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", d => {
            return (
              (d.text_align == "end" ? -1 : 1) * this.nodeBubbleSize(node)
            );
          })
          .attr("y2", 0)
          .attr("y1", 0)
          .attr("x2", d => {
            return this.shiftTip(d)[0];
          });
        tracers.attr("transform", d => {
          return this.d3PhylotreeSvgRotate(d.text_angle);
        });
      }
    } else {
      tracers.remove();
    }
    if (this.options["draw-size-bubbles"]) {
      var shift = this.nodeBubbleSize(node);
      let circles = container
        .selectAll("circle")
        .data([shift])
        .enter()
        .append("circle");
      circles.attr("r", function(d) {
        return d;
      });
      if (this.shown_font_size >= 5) {
        labels = labels.attr("dx", d => {
          return (
            (d.text_align == "end" ? -1 : 1) *
            ((this.alignTips() ? 0 : shift) + this.shown_font_size * 0.33)
          );
        });        
      }
    } else {
      if (this.shown_font_size >= 5) {
        labels = labels.attr("dx", d => { // eslint-disable-line
          return (d.text_align == "end" ? -1 : 1) * this.shown_font_size * 0.33;
        });
      }
    }
  }
  if (!is_leaf) {
    let circles = container
      .selectAll("circle")
      .data([node])
      .enter()
      .append("circle"),
    radius = this.node_circle_size()(node);
    if (radius > 0) {
      circles
        .merge(circles)
        .attr("r", d => {
          return Math.min(this.shown_font_size * 0.75, radius);
        })
        .on("click", d => {
          this.handle_node_click(d);
        });
    } else {
      circles.remove();
    }
  }
  if (this.node_styler) {
    this.node_styler(container, node);
  }
  var sc = node.score
  var dp = node.depth
  var bcn_dp = node.BCN_Depth    
  if (sc !== undefined && dp !== undefined && bcn_dp !== undefined) {
    var haz_title = container.selectAll("title");
    if (haz_title.empty()) {
      haz_title = container.append("title");
    }
    haz_title.text("Nodescore = " + sc + "\nDepth = " + dp + "\nDepth BCN = " + bcn_dp);
  } else if (dp !== undefined) {
    var haz_title1 = container.selectAll("title");
    if (haz_title1.empty()) {
      haz_title1 = container.append("title");
    }
    haz_title1.text("Depth = " + dp);
  } else {
    container.selectAll("title").remove();
  }  
  return node;
}

function updateHasHiddenNodes() {
  let nodes = this.phylotree.nodes.descendants();
  for (let k = nodes.length - 1; k >= 0; k -= 1) {
    if (isLeafNode(nodes[k])) {
      nodes[k].hasHiddenNodes = nodes[k].notshown;
    } else {
      nodes[k].hasHiddenNodes = nodes[k].children.reduce(function(p, c) {
        return c.notshown || p;
      }, false);
    }
  }
  return this;
}

function showInternalName(node) {
  const i_names = this.internalNames();
  if (i_names) {
    if (typeof i_names === "function") {
      return i_names(node);
    }
    return i_names;
  }
  return false;
}

/** Adjustment:
 * Reclass the css_classes based on the nodescore
 *  */
function reclassNode(node) {
  let class_var = css_classes[isLeafNode(node) ? "node" : "internal-node"];
  //Nodes will be on gradient from orange to red to purple
  if (node.score <0.1) {
    class_var = css_classes["n01"];
  } else if (node.score <0.2){
    class_var = css_classes["n02"];
  } else if (node.score <0.3){
    class_var = css_classes["n03"];
  } else if (node.score <0.4){
    class_var = css_classes["n04"];
  } else if (node.score <0.5){
    class_var = css_classes["n05"];
  } else if (node.score <0.6){
    class_var = css_classes["n06"];
  } else if (node.score <0.7){
    class_var = css_classes["n07"];
  } else if (node.score <0.8){
    class_var = css_classes["n08"];
  } else if (node.score <0.9){
    class_var = css_classes["n09"];
  } else if (node.score <1.0){
    class_var = css_classes["n10"];
  } //Nodes will be bright green if they have node score 1
  else if (node.score == 1.0) {
    class_var = css_classes["n1"]; 
  }
  return class_var;
}

function nodeVisible(node) {
  return !(node.hidden || node.notshown || false);
}

function nodeNotshown(node) {
  return node.notshown;
}

function hasHiddenNodes(node) {
  return node.hasHiddenNodes || false;
}

function isNodeCollapsed(node) {
  return node.collapsed || false;
}

/** Adjustment:
 * Added new css_classes based on the nodescore
 *  */
function nodeCssSelectors(css_classes) {
  return [
    css_classes["node"],
    css_classes["internal-node"],
    css_classes["n01"],
    css_classes["n02"],
    css_classes["n03"],
    css_classes["n04"],
    css_classes["n05"],
    css_classes["n06"],
    css_classes["n07"],
    css_classes["n08"],
    css_classes["n09"],
    css_classes["n10"],
    css_classes["n1"],
    css_classes["collapsed-node"]
  ].reduce(function(p, c, i, a) {
    return (p += "g." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

function internalLabel(callback, respect_existing) {
  this.phylotree.clearInternalNodes(respect_existing);
  for (var i = this.phylotree.nodes.descendants().length - 1; i >= 0; i--) {
    var d = this.phylotree.nodes.descendants()[i];
    if (!(isLeafNode(d) || itemSelected(d, this.selection_attribute_name))) {
      d[this.selection_attribute_name] = callback(d.children);
    }
  }
  this.modifySelection((d, callback) => {
    if (isLeafNode(d.target)) {
      return d.target[this.selection_attribute_name];
    }
    return d.target[this.selection_attribute_name];
  });
}

function defNodeLabel(_node) {
  _node = _node.data;
  if (isLeafNode(_node)) {
    return _node.name || "";
  }
  if (this.showInternalName(_node)) {
    return _node.name;
  }
  return "";
}

var render_nodes = /*#__PURE__*/Object.freeze({
  __proto__: null,
  shiftTip: shiftTip,
  drawNode: drawNode,
  updateHasHiddenNodes: updateHasHiddenNodes,
  showInternalName: showInternalName,
  reclassNode: reclassNode,
  nodeVisible: nodeVisible,
  nodeNotshown: nodeNotshown,
  hasHiddenNodes: hasHiddenNodes,
  isNodeCollapsed: isNodeCollapsed,
  nodeCssSelectors: nodeCssSelectors,
  internalLabel: internalLabel,
  defNodeLabel: defNodeLabel,
});

function cladeCssSelectors(css_classes) {
  return [css_classes["clade"]].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

function updateCollapsedClades(transitions) {
  var rectangle = { 
    draw: function(context, size){
      let s = Math.sqrt(size)/2;
      context.moveTo(s/4,s*2);
      context.lineTo(s/4,-s*2);
      context.lineTo(-s/4,-s*2);
      context.lineTo(-s/4,s*2);
      context.closePath();
    }
  }
  let enclosure = this.svg.selectAll("." + this.css_classes["tree-container"]);
  var node_id = 0;
  let collapsed_clades = enclosure
    .selectAll(cladeCssSelectors(this.css_classes))
    .data(
      this.phylotree.nodes.descendants().filter(isNodeCollapsed),
      function(d) {
        return d.id || (d.id = ++node_id);
      }
    );
  let spline = function() {};
  let spline_f = ___namespace.noop();
  // Collapse radial differently
  if (this.radial()) {
    spline = d3.symbol().type(rectangle).size(100);
    spline_f = function(coord, i, d, init_0, init_1) {
      if (i) {
        return [
          d.screen_y + (coord[0] - init_0) / 50,
          d.screen_x + (coord[1] - init_1) / 50
        ];
      } else {
        return [d.screen_y, d.screen_x];
      }
    };
  } else {
    spline = d3.symbol().type(rectangle).size(100);    
    spline_f = function(coord, i, d, init_0, init_1) {
      if (i) {
        return [
          d.screen_y + (coord[0] - init_0) / 50 ,
          d.screen_x + (coord[1] - init_1) / 50,
        ];
      } else {
        return [d.screen_y, d.screen_x];
      }
    };
  }
  collapsed_clades
    .exit()
    .each(function(d) {
      d.collapsed_clade = null;      
    })
    .remove();
  if (transitions) {
    collapsed_clades
      .enter()
      .insert("path", ":first-child")
      .attr("class", this.css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {
        if (d.collapsed_clade) {
          return d.collapsed_clade;
        }
        let init_0 = d.collapsed[0][0];
        let init_1 = d.collapsed[0][1];
        // #1 return spline(d.collapsed.map(spline_f, d, init_0, init_1));
        return spline(
          d.collapsed.map(function(coord, i) {
            return spline_f(coord, i, d, init_0, init_1);
          })
        );
      })
      .attr("d", function(d) {        
        return (d.collapsed_clade = spline(d.collapsed));
      })
      .attr("transform",function(d){
        return `translate(${d.collapsed[0][1]+d.height*10},${d.collapsed[0][0]}) scale(${d.height}) rotate(-90)`;  
      });
  } else {
    collapsed_clades
      .enter()
      .insert("path", ":first-child")
      .attr("class", this.css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {
        return (d.collapsed_clade ? d.collapsed_clade : d.collapsed_clade = spline(d.collapsed));
      })
      .attr("d", function(d) {        
        return (d.collapsed_clade = spline(d.collapsed));
      })
      .attr("transform",function(d){
        return `translate(${d.collapsed[0][1]+d.height*10},${d.collapsed[0][0]}) scale(${d.height}) rotate(-90)`;         
      });
  }
}

var clades = /*#__PURE__*/Object.freeze({
  __proto__: null,
  cladeCssSelectors: cladeCssSelectors,
  updateCollapsedClades: updateCollapsedClades
});

function drawEdge(container, edge, transition) {
  container = d3__namespace.select(container);
  container = container
    .attr("class", d => {
      return this.reclassEdge(d);
    })
    .on("click", d => {
      this.modifySelection([d.target], this.selection_attribute_name);
      this.update();
    });
  let new_branch_path = this.draw_branch([edge.source, edge.target]);
  if (transition) {
    if (container.datum().existing_path) {
      container = container.attr("d", function(d) {
        return d.existing_path;
      });
    }
    container = container.attr("d", new_branch_path);
  } else {
    container = container.attr("d", new_branch_path);
  }
  edge.existing_path = new_branch_path;
  var bl = this.phylotree.branch_length_accessor(edge.target);
  if (bl !== undefined) {
    var haz_title = container.selectAll("title");
    if (haz_title.empty()) {
      haz_title = container.append("title");
    }
    haz_title.text("Length = " + bl);
  } else {
    container.selectAll("title").remove();
  }
  if (this.edge_styler) {
    this.edge_styler(container, edge, transition);
  }
  return this.phylotree;
}

/** Adjustment:
 * Reclass the css_classes based on the nodescore
 *  */
function reclassEdge(edge) {
  let class_var = css_classes["branch"];
  if (edge.source.score < 0.1) {
    class_var = css_classes["b01"];
  } else if (edge.source.score < 0.2) {
    class_var = css_classes["b02"];
  } else if (edge.source.score < 0.3) {
    class_var = css_classes["b03"];
  } else if (edge.source.score < 0.4) {
    class_var = css_classes["b04"];
  } else if (edge.source.score < 0.5) {
    class_var = css_classes["b05"];
  } else if (edge.source.score < 0.6) {
    class_var = css_classes["b06"];
  } else if (edge.source.score < 0.7) {
    class_var = css_classes["b07"];
  } else if (edge.source.score < 0.8) {
    class_var = css_classes["b08"];
  } else if (edge.source.score < 0.9) {
    class_var = css_classes["b09"];
  } else if (edge.source.score < 1) {
    class_var = css_classes["b10"];
  } else if (edge.source.score == 1) {
    class_var = css_classes["b1"];
  }
  if (itemTagged(edge)) {
    class_var += " " + css_classes["tagged-branch"];
  }
  if (itemSelected(edge, this.selection_attribute_name)) {
    class_var += " " + css_classes["selected-branch"];
  }
  return class_var;
}

function initializeEdgeLabels() {
  this.links.forEach(d => {
    if(d.target.data.annotation) {
      d.target[d.target.data.annotation] = d.target.data.annotation;
    }
  });
}

function syncEdgeLabels() {
  this.links.forEach(d => {
    d[this.selection_attribute_name] =
    d.target[this.selection_attribute_name] || false;
    d.tag = d.target.tag || false;
  });
  if (this.countHandler()) {
    let counts = {};
    counts[
      this.selection_attribute_name
    ] = this.links.reduce((p, c) => {
      return p + (c[this.selection_attribute_name] ? 1 : 0);      
    }, 0);
    counts["tagged"] = this.links.reduce(function(p, c) {
      return p + (itemTagged(c) ? 1 : 0);
    }, 0);
    this.countUpdate(this, counts, this.countHandler());
  }
}

function edgeVisible(edge) {
  return !(edge.target.hidden || edge.target.notshown || false);
}

/** Adjustment:
 * Added new css_classes based on the nodescore
 *  */
function edgeCssSelectors(css_classes) {
  return [
    css_classes["b01"],
    css_classes["b02"],
    css_classes["b03"],
    css_classes["b04"],
    css_classes["b05"],
    css_classes["b06"],
    css_classes["b07"],
    css_classes["b08"],
    css_classes["b09"],
    css_classes["b10"],
    css_classes["b1"],
    css_classes["branch"],
    css_classes["selected-branch"],
    css_classes["tagged-branch"]
  ].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

var render_edges = /*#__PURE__*/Object.freeze({
  __proto__: null,
  drawEdge: drawEdge,
  reclassEdge: reclassEdge,
  initializeEdgeLabels: initializeEdgeLabels,
  syncEdgeLabels: syncEdgeLabels,
  edgeVisible: edgeVisible,
  edgeCssSelectors: edgeCssSelectors,
});

let d3_layout_phylotree_event_id = "phylotree.event";

function toggleCollapse(node) {
  if (node.collapsed) {
    node.collapsed = false;
    let unhide = function(n) {
      if (!isLeafNode(n)) {
        if (!n.collapsed) {
          n.children.forEach(unhide);
        }
      }
      n.hidden = false;
    };
    unhide(node);
  } else {
    node.collapsed = true;
  }
  this.placenodes();
  return this;
}

function resizeSvg(tree, svg, tr) {
  let sizes = this.size;
  if (this.radial()) {
    let pad_radius = this.pad_width(),
    vertical_offset =
      this.options["top-bottom-spacing"] != "fit-to-size"
      ? this.pad_height()
      : 0;
    sizes = [
      sizes[1] + 2 * pad_radius,
      sizes[0] + 2 * pad_radius + vertical_offset
    ];
    if (svg) {
      svg
        .selectAll("." + css_classes["tree-container"])
        .attr(
          "transform",
          "translate (" +
          pad_radius +
          "," +
          (pad_radius + vertical_offset) +
          ")"
        );
    }
  } else {
    sizes = [
      sizes[0] +
      (this.options["top-bottom-spacing"] != "fit-to-size"
      ? this.pad_height()
      : 0),
      sizes[1] +
      (this.options["left-right-spacing"] != "fit-to-size"
      ? this.pad_width()
      : 0)
    ];
  }
  if (svg) {
    if (tr) {
      svg = svg.transition(100);
    }
    svg.attr("height", sizes[0]).attr("width", sizes[1]);
  }
  this.size = sizes;
  return sizes;
}

function triggerRefresh(tree) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["refresh", tree]
  });
  document.dispatchEvent(event);
}

function countUpdate(tree, counts) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["countUpdate", counts, tree.countHandler()]
  });
  document.dispatchEvent(event);
}

function d3PhylotreeTriggerLayout(tree) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["layout", tree, tree.layoutHandler()]
  });
  document.dispatchEvent(event);
}

function d3PhylotreeEventListener(event) {
  switch (event.detail[0]) {
    case "refresh":
      event.detail[1].refresh();
      break;
    case "countUpdate":
      event.detail[2](event.detail[1]);
      break;
    case "layout":
      event.detail[2](event.detail[1]);
  }
  return true;
}

function d3PhylotreeAddEventListener() {
  document.addEventListener(
    d3_layout_phylotree_event_id,
    d3PhylotreeEventListener,
    false
  );
}

function d3PhylotreeSvgTranslate(x) {
  if (x && (x[0] !== null || x[1] !== null))
    return (
      "translate (" +
      (x[0] !== null ? x[0] : 0) +
      "," +
      (x[1] !== null ? x[1] : 0) +
      ") "
  );
  return "";
}

function d3PhylotreeSvgRotate(a) {
  if (a !== null) {
    return "rotate (" + a + ") ";
  }
  return "";
}

var events = /*#__PURE__*/Object.freeze({
  __proto__: null,
  toggleCollapse: toggleCollapse,
  resizeSvg: resizeSvg,
  triggerRefresh: triggerRefresh,
  countUpdate: countUpdate,
  d3PhylotreeTriggerLayout: d3PhylotreeTriggerLayout,
  d3PhylotreeEventListener: d3PhylotreeEventListener,
  d3PhylotreeAddEventListener: d3PhylotreeAddEventListener,
  d3PhylotreeSvgTranslate: d3PhylotreeSvgTranslate,
  d3PhylotreeSvgRotate: d3PhylotreeSvgRotate
});

let d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";

/** Adjustment:
 * New option in dropdown menu to compare the nodes
 *  */
function nodeDropdownMenu(node, container, phylotree, options) {
  let menu_object = d3__namespace
    .select(container)
    .select("#" + d3_layout_phylotree_context_menu_id);
  if (menu_object.empty()) {
    menu_object = d3__namespace
      .select(container)
      .append("div")
      .attr("id", d3_layout_phylotree_context_menu_id)
      .attr("class", "dropdown-menu")
      .attr("role", "menu");
  }
  menu_object.selectAll("a").remove();
  menu_object.selectAll("h6").remove();
  menu_object.selectAll("div").remove();
  if (node) {
    if (
      !___namespace.some([
        Boolean(node.menu_items),
        options["hide"],
        options["selectable"],
        options["collapsible"],
        options["showBCN"]
      ]) ||
      !options["show-menu"]
    ) return;
    if (!isLeafNode(node)) {
      if (options["collapsible"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(isNodeCollapsed(node) ? "Expand Subtree" : "Collapse Subtree")
          .on("click", d => {
            menu_object.style("display", "none");
            this.toggleCollapse(node).update();
          });
          if (options["showBCN"]) {
            menu_object
              .append("a")
              .attr("class", "dropdown-item")
              .attr("tabindex", "-1")
              .text("Compare nodes")
              .on("click", function(d) {
                menu_object.style("display", "none");
                node1 = node;
                node2 = node.BCN;
                var search_node = node1;
                while (search_node) {
                  var root = search_node;
                  search_node = search_node.parent;
                }
                if (root.tree == 1) {
                  if (node2.hasOwnProperty('newick_string')) {
                    tree1.display.modifySelection(
                      tree1.selectAllDescendants(node1, true, true));
                    tree2.display.modifySelection(
                      tree2.selectAllDescendants(node2.nodes, true, true));
                  } else if (node2.hasOwnProperty('BCN')) {
                    tree1.display.modifySelection(
                      tree1.selectAllDescendants(node1, true, true));
                    tree2.display.modifySelection(
                      tree2.selectAllDescendants(node2, true, true));
                  }
                } else if (root.tree == 2) {
                  if (node2.hasOwnProperty('newick_string')) {
                    tree2.display.modifySelection(
                      tree2.selectAllDescendants(node1, true, true));
                    tree1.display.modifySelection(
                      tree1.selectAllDescendants(node2.nodes, true, true));
                  } else if (node2.hasOwnProperty('BCN')) {
                    tree2.display.modifySelection(
                      tree2.selectAllDescendants(node1, true, true));
                    tree1.display.modifySelection(
                      tree1.selectAllDescendants(node2, true, true));
                  }
                }
              });
              node1 = [];
              node2 = [];
          }
          if (options["selectable"]) {
            menu_object.append("div").attr("class", "dropdown-divider");
            menu_object
              .append("h6")
              .attr("class", "dropdown-header")
              .text("Toggle selection");
          }
      }
      if (options["selectable"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All descendant branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, true, true)
            );
          });
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All terminal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, true, false)
            );
          });
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All internal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, false, true)
            );            
          });
      }
    }
    if (node.parent) {
      if (options["selectable"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Incident branch")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection([node]);
          });
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Path to root")
          .on("click", d => {
            menu_object.style("display", "none");
            this.modifySelection(this.phylotree.pathToRoot(node));
          });
          if (options["reroot"] || options["hide"]) {
            menu_object.append("div").attr("class", "dropdown-divider");
          }
      }
      if (options["reroot"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Reroot on this node")
          .on("click", d => {
            menu_object.style("display", "none");
            this.phylotree.reroot(node);
            this.update();
          });
      }
      if (options["hide"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Hide this " + (isLeafNode(node) ? "node" : "subtree"))
          .on("click", d => {
            menu_object.style("display", "none");
            this.modifySelection([node], "notshown", true, true)
                .updateHasHiddenNodes()
                .update();
          });
      }
    }
    if (hasHiddenNodes(node)) {
      menu_object
        .append("a")
        .attr("class", "dropdown-item")
        .attr("tabindex", "-1")
        .text("Show all descendant nodes")
        .on("click", function(d) {
          menu_object.style("display", "none");
          phylotree
            .modifySelection(
              phylotree.selectAllDescendants(node, true, true),
              "notshown",
              true,
              true,
              "false"
            )
            .updateHasHiddenNodes()
            .update();
        });
    }
    var has_user_elements = [];
    if ("menu_items" in node && typeof node["menu_items"] === "object") {
      node["menu_items"].forEach(function(d) {
        if (d.length == 3) {
          if (!d[2] || d[2](node)) {
            has_user_elements.push([d[0], d[1]]);
          }
        }
      });
    }
    if (has_user_elements.length) {
      const show_divider_options = [
        options["hide"],
        options["selectable"],
        options["collapsible"],
        options["showBCN"],
      ];
      if (___namespace.some(show_divider_options)) {
        menu_object.append("div").attr("class", "dropdown-divider");
      }
      has_user_elements.forEach(function(d) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(constant(d[0])(node)) // eslint-disable-line
          .on("click", ___namespace.partial(d[1], node));
      });
    }
    let tree_container = $(container); // eslint-disable-line
    let coordinates = d3__namespace.mouse(tree_container[0]);
    menu_object
      .style("position", "absolute")
      .style("left", "" + (coordinates[0] + tree_container.position().left) + "px")
      .style("top", "" + (coordinates[1] + tree_container.position().top) + "px")
      .style("display", "block");
  } else {
    menu_object.style("display", "none");
  }
}

function modifySelection(
  node_selecter,
  attr,
  place,
  skip_refresh,
  mode
) {
  attr = attr || this.selection_attribute_name;
  mode = mode || "toggle";
  // check if node_selecter is a value of pre-defined selecters
  if (this.options["restricted-selectable"].length) {
    // the selection must be from a list of pre-determined selections
    if (___namespace.contains(___namespace.keys(predefined_selecters), node_selecter)) {
      node_selecter = predefined_selecters[node_selecter];
    } else { return; }
  }
  if (
    (this.options["restricted-selectable"] || this.options["selectable"]) &&
    !this.options["binary-selectable"]
  ) {
    var do_refresh = false;
    if (typeof node_selecter === "function") {
      this.links.forEach(function(d) {
        let select_me = node_selecter(d);
        d[attr] = d[attr] || false;
        if (d[attr] != select_me) {
          d[attr] = select_me;
          do_refresh = true;
          d.target[attr] = select_me;
        }
      });
    } else {
      node_selecter.forEach(function(d) {
        var new_value;
        switch (mode) {
          case "true":
            new_value = true;
            break;
          case "false":
            new_value = false;
            break;
          default:
            new_value = !d[attr];
            break;
        }
        if (d[attr] != new_value) {
          d[attr] = new_value;
          do_refresh = true;
        }
      });
      this.links.forEach(function(d) {
        d[attr] = d.target[attr];
      });
    }
    var counts;
    if (do_refresh) {
      if (!skip_refresh) {
        triggerRefresh(this);
      }
      if (this.countHandler) {
        counts = {};
        counts[attr] = this.links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        countUpdate(this, counts, this.countHandler);
      }
      if (place) {
        this.placenodes();
      }
    }
  } else if (this.options["binary-selectable"]) {
    if (typeof node_selecter === "function") {
      this.links.forEach(function(d) {
        var select_me = node_selecter(d);
        d[attr] = d[attr] || false;
        if (d[attr] != select_me) {
          d[attr] = select_me;
          do_refresh = true;
          d.target[attr] = select_me;
        }
        this.options["attribute-list"].forEach(function(type) {
          if (type != attr && d[attr] === true) {
            d[type] = false;
            d.target[type] = false;
          }
        });
      });
    } else {
      node_selecter.forEach(function(d) {
        var new_value;
        new_value = !d[attr];
        if (d[attr] != new_value) {
          d[attr] = new_value;
          do_refresh = true;
        }
      });
      this.links.forEach(function(d) {
        d[attr] = d.target[attr];
        this.options["attribute-list"].forEach(function(type) {
          if (type != attr && d[attr] !== true) {
            d[type] = false;
            d.target[type] = false;
          }
        });
      });
    }
    if (do_refresh) {
      if (!skip_refresh) {
        triggerRefresh(this);
      }
      if (this.countHandler()) {
        counts = {};
        counts[attr] = this.links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        this.countUpdate(this, counts, this.countHandler());
      }
      if (place) {
        this.placenodes();
      }
    }
  }
  if (this.selectionCallback && attr != "tag") {
    this.selectionCallback(this.getSelection());
  }
  this.refresh();
  this.update();
  return this;
}

function getSelection() {
  return this.nodes.filter(d => {
    return d[this.selection_attribute_name];
  });
}

function selectAllDescendants(node, terminal, internal) {
  let selection = [];
  function sel(d) {
    if (isLeafNode(d)) {
      if (terminal) {
        if (d != node) selection.push(d);
      }
    } else {
      if (internal) {
        if (d != node) selection.push(d);
      }
      d.children.forEach(sel);
    }
  }
  sel(node);
  return selection;
}

function selectionCallback(callback) {
  if (!callback) return this.selectionCallback;
  this.selectionCallback = callback;
  return this;
}

var menus = /*#__PURE__*/Object.freeze({
  __proto__: null,
  nodeDropdownMenu: nodeDropdownMenu,
  modifySelection: modifySelection,
  getSelection: getSelection,
  selectAllDescendants: selectAllDescendants,
  selectionCallback: selectionCallback
});

function constant$1(x) {
  return function() {
    return x;
  };
}

class TreeRender {
  constructor(phylotree, options = {}) {
    this.css_classes = css_classes;
    this.phylotree = phylotree;
    this.container = options.container;
    this.separation = function(_node, _previous) {
      return 0;
    };
    this._nodeLabel = this.defNodeLabel;
    this.svg = null;
    this.selectionCallback = null;
    this.scales = [1, 1];
    this.size = [1, 1];
    this.fixed_width = [14, 30];
    this.font_size = 12;
    this.scale_bar_font_size = 12;
    this.offsets = [0, this.font_size / 2];
    this.draw_branch = draw_line;
    this.draw_scale_bar = null;
    this.edge_placer = lineSegmentPlacer;
    this.count_listener_handler = function() {};
    this.layout_listener_handler = function() {};
    this.node_styler = undefined;
    this.edge_styler = undefined;
    this.shown_font_size = this.font_size;
    this.selection_attribute_name = "selected";
    this.right_most_leaf = 0;
    this.label_width = 0;
    this.radial_center = 0;
    this.radius = 1;
    this.radius_pad_for_bubbles = 0;
    this.rescale_nodeSpan = 1;
    this.relative_nodeSpan = function(_node) {
      return this.nodeSpan(_node) / this.rescale_nodeSpan;
    };
    let default_options = {
      layout: "left-to-right",
      logger: console,
      branches: "step",
      scaling: true,
      bootstrap: false,
      "color-fill": false,
      "internal-names": false,
      selectable: true,
      // restricted-selectable can take an array of predetermined
      // selecters that are defined in phylotree.predefined_selecters
      // only the defined functions will be allowed when selecting
      // branches
      "restricted-selectable": false,
      collapsible: true,
      showBCN : true,
      "left-right-spacing": "fixed-step", //'fit-to-size',
      "top-bottom-spacing": "fixed-step",
      "left-offset": 0,
      "show-scale": "top",
      // currently not implemented to support any other positioning
      "draw-size-bubbles": false,
      "binary-selectable": false,
      "is-radial": false,
      "attribute-list": [],
      "max-radius": 768,
      "annular-limit": 0.38196601125010515,
      compression: 0.2,
      "align-tips": false,
      "maximum-per-node-spacing": 100,
      "minimum-per-node-spacing": 2,
      "maximum-per-level-spacing": 100,
      "minimum-per-level-spacing": 10,
      node_circle_size: constant$1(3),
      transitions: null,
      brush: true,
      reroot: true,
      hide: true,
      "label-nodes-with-name": false,
      zoom: false,
      "show-menu": true,
      "show-labels": true,
      "node-styler": null,
      "edge-styler": null,
      "node-span": null
    };
    this.ensure_size_is_in_px = function(value) {
      return typeof value === "number" ? value + "px" : value;
    };
    this.options = ___namespace.defaults(options, default_options);
    this.width = this.options.width || 800;
    this.height = this.options.height || 600;
    this.node_styler = this.options['node-styler'];
    this.edge_styler = this.options['edge-styler'];
    this.nodeSpan = this.options['node-span'];
    if(!this.nodeSpan) {
      this.nodeSpan = function(_node) {
        return 1;
      };
    }
    this.rescale_nodeSpan =
      this.phylotree.nodes.children
        .map(d => {
          if (isLeafNode(d) || this.showInternalName(d))
            return this.nodeSpan(d);
        })
        .reduce(function(p, c) {
          return Math.min(c, p || 1e200);
        }, null) || 1;
    this.initialize_svg(this.container);
    this.links = this.phylotree.nodes.links();
    this.initializeEdgeLabels();
    this.update();
    d3PhylotreeAddEventListener();
  }
  pad_height() {
    if (this.draw_scale_bar) {
      return this.scale_bar_font_size + 25;
    }
    return 0;
  }
  pad_width() {
    // reset label_width
    this.label_width = this._label_width(this.shown_font_size);
    const _label_width = this.options["show-labels"] ? this.label_width : 0;
    return this.offsets[1] + this.options["left-offset"] + _label_width;
  }
  collapse_node(n) {
    if (!isNodeCollapsed(n)) {
      n.collapsed = true;
    }
  }
  set_size(attr) {
    if (!arguments.length) {
      return this.size;
    }
    let phylo_attr = attr;
    if (this.options["top-bottom-spacing"] != "fixed-step") {
      this.size[0] = phylo_attr[0];
    }
    if (this.options["left-right-spacing"] != "fixed-step") {
      this.size[1] = phylo_attr[1];
    }
    return this;
  }
  initialize_svg(svg_element) {
    if (this.svg !== svg_element) {
      d3__namespace.select(svg_element)
        .select("svg")
        .remove();
      this.svg = d3__namespace
        .create("svg")
        .attr("width", this.width)
        .attr("height", this.height);
      this.set_size([this.height, this.width]);
      if (this.css_classes["tree-container"] == "phylotree-container") {
        this.svg.selectAll("*").remove();
        this.svg.append("defs");
      }
      d3__namespace.select(this.container).on(
        "click",
        d => {
          this.handle_node_click(null);
        },
        true
      );
    }
    return this;
  }
  update_layout(new_json, do_hierarchy) {
    if (do_hierarchy) {
      this.nodes = d3__namespace.hierarchy(new_json);
      this.nodes.each(function(d) {
        d.id = null;
      });
    }
    this.update();
    this.syncEdgeLabels();
  }
  update(transitions) {
    var self = this;
    this.placenodes();
    transitions = this.transitions(transitions);
    let node_id = 0;
    let enclosure = this.svg
      .selectAll("." + css_classes["tree-container"])
      .data([0]);
    enclosure = enclosure
      .enter()
      .append("g")
      .attr("class", css_classes["tree-container"])
      .merge(enclosure)
      .attr("transform", d => {
        return this.d3PhylotreeSvgTranslate([
          this.offsets[1] + this.options["left-offset"],
          this.pad_height()
        ]);
      });
    if (this.draw_scale_bar) {
      let scale_bar = this.svg
        .selectAll("." + css_classes["tree-scale-bar"])
        .data([0]);
      scale_bar
        .enter()
        .append("g")
        .attr("class", css_classes["tree-scale-bar"])
        .style("font-size", this.ensure_size_is_in_px(this.scale_bar_font_size))
        .merge(scale_bar)
        .attr("transform", d => {
          return this.d3PhylotreeSvgTranslate([
            this.offsets[1] + this.options["left-offset"],
            this.pad_height() - 10
          ]);
        })
        .call(this.draw_scale_bar);
      scale_bar.selectAll("text").style("text-anchor", "end");
    } else {
      this.svg.selectAll("." + css_classes["tree-scale-bar"]).remove();
    }
    enclosure = this.svg
      .selectAll("." + css_classes["tree-container"])
      .data([0]);
    this.updateCollapsedClades(transitions);  
    let drawn_links = enclosure
      .selectAll(edgeCssSelectors(css_classes))
      .data(this.links.filter(edgeVisible), d => {
        return d.target.id || (d.target.id = ++node_id);
      });
    if (transitions) {
      drawn_links.exit().remove();
    } else {
      drawn_links.exit().remove();
    }
    drawn_links = drawn_links
      .enter()
      .insert("path", ":first-child")
      .merge(drawn_links)
      .each(function(d) {
        self.drawEdge(this, d, transitions);
      });
    let drawn_nodes = enclosure
      .selectAll(nodeCssSelectors(css_classes))
      .data(
        this.phylotree.nodes.descendants().filter(nodeVisible),
        d => {
          return d.id || (d.id = ++node_id);
        }
      );
    drawn_nodes.exit().remove();
    drawn_nodes = drawn_nodes
      .enter()
      .append("g")
      .attr("class", this.reclassNode)
      .merge(drawn_nodes)
      .attr("transform", d => {
        const should_shift =
          this.options["layout"] == "right-to-left" && isLeafNode(d);
        d.screen_x = xCoord(d);
        d.screen_y = yCoord(d);
        return this.d3PhylotreeSvgTranslate([
          should_shift ? 0 : d.screen_x,
          d.screen_y
        ]);
      })
      .each(function(d) {
        self.drawNode(this, d, transitions);
      })
      .attr("transform", d => {
        if (!___namespace.isUndefined(d.screen_x) && !___namespace.isUndefined(d.screen_y)) {
          return "translate(" + d.screen_x + "," + d.screen_y + ")";
        }
      });
    if (this.options["label-nodes-with-name"]) {
      drawn_nodes = drawn_nodes.attr("id", d => {
        return "node-" + d.name;
      });
    }
    this.resizeSvg(this.phylotree, this.svg, transitions);
    if (this.options["brush"]) {
      var brush = enclosure
        .selectAll("." + css_classes["tree-selection-brush"])
        .data([0])
        .enter()
        .insert("g", ":first-child")
        .attr("class", css_classes["tree-selection-brush"]);
      var brush_object = d3__namespace
        .brush()
        .on("brush", d => {
          var extent = d3__namespace.event.selection,
            shown_links = this.links.filter(edgeVisible);
            var selected_links = shown_links
              .filter((d, i) => {
                return (
                  d.source.screen_x >= extent[0][0] &&
                  d.source.screen_x <= extent[1][0] &&
                  d.source.screen_y >= extent[0][1] &&
                  d.source.screen_y <= extent[1][1] &&
                  d.target.screen_x >= extent[0][0] &&
                  d.target.screen_x <= extent[1][0] &&
                  d.target.screen_y >= extent[0][1] &&
                  d.target.screen_y <= extent[1][1]
                );
              })
              .map(d => {
                return d.target;
              });
          this.modifySelection(
            this.phylotree.links.map(d => {
              return d.target;
            }),
            "tag",
            false,
            selected_links.length > 0,
            "false"
          );
          this.modifySelection(selected_links, "tag", false, false, "true");
        })
        .on("end", () => {
        });
      brush.call(brush_object);
    }
    this.syncEdgeLabels();
    if (this.options["zoom"]) {
      let zoom = d3__namespace
        .zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", () => {
          d3__namespace.select("." + css_classes["tree-container"]).attr("transform", d => {
            let toTransform = d3__namespace.event.transform;
            return toTransform;
          });
          d3__namespace.select("." + css_classes["tree-scale-bar"]).attr("transform", d => {
            let toTransform = d3__namespace.event.transform;
            toTransform.y -= 10; 
            return toTransform;
          });  
        });
      this.svg.call(zoom);
    }
    return this;
  }
  _handle_single_node_layout(
    a_node
  ) {
    let _nodeSpan = this.nodeSpan(a_node) / this.rescale_nodeSpan;
    // compute the relative size of nodes (0,1)
    // sum over all nodes is 1
    this.x = a_node.x =
      this.x +
      this.separation(this.last_node, a_node) +
      (this.last_span + _nodeSpan) * 0.5;  
    // separation is a user-settable callback to add additional spacing on nodes
    this._extents[1][1] = Math.max(this._extents[1][1], a_node.y);
    this._extents[1][0] = Math.min(
      this._extents[1][0],
      a_node.y - _nodeSpan * 0.5
    );  
    if (this.is_under_collapsed_parent) {
      this._extents[0][1] = Math.max(
        this._extents[0][1],
        this.save_x +
          (a_node.x - this.save_x) * this.options["compression"] +
          this.save_span +
          (_nodeSpan * 0.5 + this.separation(this.last_node, a_node)) *
            this.options["compression"]
      );      
    } else {
      this._extents[0][1] = Math.max(
        this._extents[0][1],
        this.x + _nodeSpan * 0.5 + this.separation(this.last_node, a_node)
      );
    }
    this.last_node = a_node;
    this.last_span = _nodeSpan;  
  }
  tree_layout(a_node) {
    // do not layout hidden nodes
    if (nodeNotshown(a_node)) {
      return undefined;
    }
    let is_leaf = isLeafNode(a_node);
    // the next four members are radial layout options
    a_node.text_angle = null; // the angle at which text is being laid out
    a_node.text_align = null; // css alignment option for node labels
    a_node.radius = null; // radial layout radius
    a_node.angle = null; // radial layout angle (in radians)
    let undef_BL = false;
    // last node laid out in the top bottom hierarchy
    if (a_node["parent"]) {
      if (this.do_scaling) {
        if (undef_BL) {
          return 0;
        }
        a_node.y = this.phylotree.branch_length_accessor(a_node);
        if (typeof a_node.y === "undefined") {
          undef_BL = true;
          return 0;
        }
        a_node.y += a_node.parent.y;
      } else {
        a_node.y = is_leaf ? this.max_depth : a_node.depth;
      }
    } else {
      this.x = 0.0;
      // the span of the last node laid out in the top to bottom hierarchy
      a_node.y = 0.0;
      this.last_node = null;
      this.last_span = 0.0;
      this._extents = [[0, 0], [0, 0]];
    }
    if (is_leaf) {
      // displayed internal nodes are handled in `process_internal_node`
      this._handle_single_node_layout(
        a_node
      );
    }
    if (!is_leaf) {
      // for internal nodes
      if (
        isNodeCollapsed(a_node) &&
        !this.is_under_collapsed_parent
      ) {
        // collapsed node
        this.save_x = this.x;
        this.save_span = this.last_span * 0.5;
        this.is_under_collapsed_parent = true;
        this.process_internal_node(a_node);
        this.is_under_collapsed_parent = false;
        if (typeof a_node.x === "number") {
          a_node.x =
            this.save_x +
            (a_node.x -this.save_x) * this.options["compression"] +
            this.save_span;
          a_node.collapsed = [[a_node.x, a_node.y]];
          var map_me = n => {
            n.hidden = true;
            if (isLeafNode(n)) {            
              this.x = n.x =
                this.save_x +
                (n.x - this.save_x) * this.options["compression"] +
                this.save_span;
                a_node.collapsed.push([n.x, n.y]);             
            } else {
              n.children.map(map_me);
            }
          };
          this.x = this.save_x;
          map_me(a_node); 
          a_node.collapsed.splice(1, 0, [this.save_x, a_node.y]);
          a_node.collapsed.push([this.x, a_node.y]);
          a_node.collapsed.push([a_node.x, a_node.y]);
          a_node.hidden = false;
        }
      } else {
        // normal node, or under a collapsed parent
        this.process_internal_node(a_node);
      }
    }
    return a_node.x;
  }
  process_internal_node(a_node) {
    let count_undefined = 0;
    if (this.showInternalName(a_node)) {
      // do in-order traversal to allow for proper internal node spacing
      // (x/2) >> 0 is integer division
      let half_way = (a_node.children.length / 2) >> 0;
      let displayed_children = 0;
      let managed_to_display = false;
      for (let child_id = 0; child_id < a_node.children.length; child_id++) {
        let child_x = this.tree_layout(a_node.children[child_id]);//.bind(this);
        if (typeof child_x == "number") {
          displayed_children++;
        }
        if (displayed_children >= half_way && !managed_to_display) {
          this._handle_single_node_layout(a_node);
          managed_to_display = true;
        }
      }
      if (displayed_children == 0) {
        a_node.notshown = true;
        a_node.x = undefined;
      } else {
        if (!managed_to_display) {
          this._handle_single_node_layout(a_node);
        }
      }
    } else {
      // postorder layout
      a_node.x = a_node.children
        .map(this.tree_layout.bind(this))
        .reduce((a, b) => {
          if (typeof b == "number") return a + b;
          count_undefined += 1;
          return a;
        }, 0.0);
      if (count_undefined == a_node.children.length) {
        a_node.notshown = true;
        a_node.x = undefined;
      } else {
        a_node.x /= a_node.children.length - count_undefined;
      }
    }
  }
  do_lr(at_least_one_dimension_fixed) {
    if (this.radial() && at_least_one_dimension_fixed) {
      this.offsets[1] = 0;
    }
    if (this.options["left-right-spacing"] == "fixed-step") {
      this.size[1] = this.max_depth * this.fixed_width[1];
      this.scales[1] = 
        (this.size[1] - this.offsets[1] - this.options["left-offset"]) /
        this._extents[1][1];
      this.label_width = this._label_width(this.shown_font_size);
      if (this.radial()) {
        this.label_width *= 2;
      }
    } else {
      this.label_width = this._label_width(this.shown_font_size);
      at_least_one_dimension_fixed = true;
      let available_width =
        this.size[1] - this.offsets[1] - this.options["left-offset"];
      if (available_width * 0.5 < this.label_width) {
        this.shown_font_size *= (available_width * 0.5) / this.label_width;
        this.label_width = available_width * 0.5;
      }
      this.scales[1] =
        (this.size[1] -
          this.offsets[1] -
          this.options["left-offset"] -
          this.label_width) /
        this._extents[1][1];
    }
  }
  placenodes() {
    this._extents = [
      [0, 0],
      [0, 0]
    ];
    this.x = 0.0;
    this.last_span = 0.0;      
    this.last_node = null;
    this.last_span = 0.0;
    (this.save_x = this.x), (this.save_span = this.last_span * 0.5);
    this.do_scaling = this.options["scaling"];
    let undef_BL = false;
    this.is_under_collapsed_parent = false;
    this.max_depth = 1;  
    // Set initial x
    this.phylotree.nodes.x = this.tree_layout(
      this.phylotree.nodes,
      this.do_scaling
    );
    this.max_depth = d3__namespace.max(this.phylotree.nodes.descendants(), n => {
      return n.depth;
    });
    if (this.do_scaling && undef_BL) {
      // requested scaling, but some branches had no branch lengths
      // redo layout without branch lengths
      this.do_scaling = false;
      this.phylotree.nodes.x = this.tree_layout(this.phylotree.nodes);
    }
    let at_least_one_dimension_fixed = false;
    this.draw_scale_bar = this.options["show-scale"] && this.do_scaling;
    // this is a hack so that phylotree.pad_height would return ruler spacing
    this.offsets[1] = Math.max(
      this.font_size,
      -this._extents[1][0] * this.fixed_width[0]
    );
    if (this.options["top-bottom-spacing"] == "fixed-step") {
      this.size[0] = this._extents[0][1] * this.fixed_width[0];
      this.scales[0] = this.fixed_width[0];
    } else {
      this.scales[0] = (this.size[0] - this.pad_height()) / this._extents[0][1];
      at_least_one_dimension_fixed = true;
    }
    this.shown_font_size = Math.min(this.font_size, this.scales[0]);
    if (this.radial()) {
      // map the nodes to polar coordinates
      this.draw_branch = ___namespace.partial(drawArc, this.radial_center);
      this.edge_placer = arcSegmentPlacer;
      let last_child_angle = null,
        last_circ_position = null,
        last_child_radius = null,
        min_radius = 0,
        effective_span = this._extents[0][1] * this.scales[0];
      let compute_distance = function(r1, r2, a1, a2, annular_shift) {
        annular_shift = annular_shift || 0;
        return Math.sqrt(
          (r2 - r1) * (r2 - r1) +
            2 *
              (r1 + annular_shift) *
              (r2 + annular_shift) *
              (1 - Math.cos(a1 - a2))
        );
      };
      let max_r = 0;
      this.phylotree.nodes.each(d => {
        let my_circ_position = d.x * this.scales[0];
        d.angle = (2 * Math.PI * my_circ_position) / effective_span;
        d.text_angle = d.angle - Math.PI / 2;
        d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
        d.text_align = d.text_angle ? "end" : "start";
        d.text_angle = (d.text_angle ? 180 : 0) + (d.angle * 180) / Math.PI;
      });
      this.do_lr(at_least_one_dimension_fixed);
      this.phylotree.nodes.each(d => {
        d.radius = (d.y * this.scales[1]) / this.size[1];
        max_r = Math.max(d.radius, max_r);
      });
      let annular_shift = 0;
      this.phylotree.nodes.each(d => {
        if (!d.children) {
          let my_circ_position = d.x * this.scales[0];
          if (last_child_angle !== null) {
            let required_spacing = my_circ_position - last_circ_position,
              radial_dist = compute_distance(
                d.radius,
                last_child_radius,
                d.angle,
                last_child_angle,
                annular_shift
              );
            let local_mr =
              radial_dist > 0
                ? required_spacing / radial_dist
                : 10 * this.options["max-radius"];
            if (local_mr > this.options["max-radius"]) {
              // adjust the annular shift
              let dd = required_spacing / this.options["max-radius"],
                b = d.radius + last_child_radius,
                c =
                  d.radius * last_child_radius -
                  (dd * dd -
                    (last_child_radius - d.radius) *
                      (last_child_radius - d.radius)) /
                    2 /
                    (1 - Math.cos(last_child_angle - d.angle)),
                st = Math.sqrt(b * b - 4 * c);
              annular_shift = Math.min(
                this.options["annular-limit"] * max_r,
                (-b + st) / 2
              );
              min_radius = this.options["max-radius"];
            } else {
              min_radius = Math.max(min_radius, local_mr);
            }
          }
          last_child_angle = d.angle;
          last_circ_position = my_circ_position;
          last_child_radius = d.radius;
        }
      });
      this.radius = Math.min(
        this.options["max-radius"],
        Math.max(effective_span / 2 / Math.PI, min_radius)
      );
      if (at_least_one_dimension_fixed) {
        this.radius = Math.min(
          this.radius,
          (Math.min(effective_span, this._extents[1][1] * this.scales[1]) -
            this.label_width) *
            0.5 -
            this.radius * annular_shift
        );
      }
      this.radial_center = this.radius_pad_for_bubbles = this.radius;
      this.draw_branch = ___namespace.partial(drawArc, this.radial_center);
      let scaler = 1;
      if (annular_shift) {
        scaler = max_r / (max_r + annular_shift);
        this.radius *= scaler;
      }
      this.phylotree.nodes.each(d => {
        cartesianToPolar(
          d,
          this.radius,
          annular_shift,
          this.radial_center,
          this.scales,
          this.size
        );
        max_r = Math.max(max_r, d.radius);
        if (this.options["draw-size-bubbles"]) {
          this.radius_pad_for_bubbles = Math.max(
            this.radius_pad_for_bubbles,
            d.radius + this.nodeBubbleSize(d)
          );
        } else {
          this.radius_pad_for_bubbles = Math.max(
            this.radius_pad_for_bubbles,
            d.radius
          );
        }
        if (d.collapsed) {
          d.collapsed = d.collapsed.map(p => {
            let z = {};
            z.x = p[0];
            z.y = p[1];
            z = cartesianToPolar(
              z,
              this.radius,
              annular_shift,
              this.radial_center,
              this.scales,
              this.size
            );
            return [z.x, z.y];
          });
          let last_point = d.collapsed[1];
          d.collapsed = d.collapsed.filter(function(p, i) {
            if (i < 3 || i > d.collapsed.length - 4) return true;
            if (
              Math.sqrt(
                Math.pow(p[0] - last_point[0], 2) +
                  Math.pow(p[1] - last_point[1], 2)
              ) > 3
            ) {
              last_point = p;
              return true;
            }
            return false;
          });
        }
      });
      this.size[0] = this.radial_center + this.radius / scaler;
      this.size[1] = this.radial_center + this.radius / scaler;
    } else {
      this.do_lr();
      this.draw_branch = draw_line;
      this.edge_placer = lineSegmentPlacer;
      this.right_most_leaf = 0;
      this.phylotree.nodes.each(d => {
        d.x *= this.scales[0];
        d.y *= this.scales[1]*.8;
        if (this.options["layout"] == "right-to-left") {   
          d.y = this._extents[1][1] * this.scales[1] - d.y;
        }
        if (isLeafNode(d)) {
          this.right_most_leaf = Math.max(
            this.right_most_leaf,
            d.y + this.nodeBubbleSize(d)
          );
        }
        if (d.collapsed) {
          d.collapsed.forEach(p => {
            p[0] *= this.scales[0];
            p[1] *= this.scales[1]*.8;
          });
          let last_x = d.collapsed[1][0];
          d.collapsed = d.collapsed.filter(function(p, i) {
            if (i < 3 || i > d.collapsed.length - 4) return true;
            if (p[0] - last_x > 3) {
              last_x = p[0];
              return true;
            }
            return false;
          });
        }
      });
    }
    if (this.draw_scale_bar) {
      let domain_limit, range_limit;
      if (this.radial()) {
        range_limit = Math.min(this.radius / 5, 50);
        domain_limit = Math.pow(
          10,
          Math.ceil(
            Math.log((this._extents[1][1] * range_limit) / this.radius) /
              Math.log(10)
          )
        );  
        range_limit = domain_limit * (this.radius / this._extents[1][1]);
        if (range_limit < 30) {
          let stretch = Math.ceil(30 / range_limit);
          range_limit *= stretch;
          domain_limit *= stretch;
        }
      } else {
        domain_limit = this._extents[1][1];
        range_limit =
          this.size[1] - this.offsets[1] - this.options["left-offset"] - this.shown_font_size;
      }
      let scale = d3__namespace
          .scaleLinear()
          .domain([0, domain_limit])
          .range([0, range_limit]), 
          scaleTickFormatter = d3__namespace.format(".2f");
      this.draw_scale_bar = d3__namespace
        .axisTop()
        .scale(scale)
        .tickFormat(function(d) {
          if (d === 0) {
            return "";
          }
          return scaleTickFormatter(d);
        });
      if (this.radial()) {
        this.draw_scale_bar.tickValues([domain_limit]);
      } else {
        let round = function(x, n) {
          return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
        };
        let my_ticks = scale.ticks();
        my_ticks = my_ticks.length > 1 ? my_ticks[1] : my_ticks[0];
        this.draw_scale_bar.ticks(
          Math.min(
            10,
            round(
              range_limit /
                (this.shown_font_size *
                  scaleTickFormatter(my_ticks).length *
                  2),
              0
            )
          )
        );
      }
    } else {
      this.draw_scale_bar = null;
    }
    return this;
  }
  spacing_x(attr, skip_render) {
    if (!arguments.length) return this.fixed_width[0];
    if (
      this.fixed_width[0] != attr &&
      attr >= this.options["minimum-per-node-spacing"] &&
      attr <= this.options["maximum-per-node-spacing"]
    ) {
      this.fixed_width[0] = attr;
      if (!skip_render) {
        this.placenodes();
      }
    }
    return this;
  }
  spacing_y(attr, skip_render) {
    if (!arguments.length) return this.fixed_width[1];
    if (
      this.fixed_width[1] != attr &&
      attr >= this.options["minimum-per-level-spacing"] &&
      attr <= this.options["maximum-per-level-spacing"]
    ) {
      this.fixed_width[1] = attr;
      if (!skip_render) {
        this.placenodes();
      }
    }
    return this;
  }
  _label_width(_font_size) {
    _font_size = _font_size || this.shown_font_size;
    let width = 0;
    this.phylotree.nodes
      .descendants()
      .filter(nodeVisible)
      .forEach(node => {
        let node_width = 12 + this._nodeLabel(node).length * _font_size * 0.8;
        if (node.angle !== null) {
          node_width *= Math.max(
            Math.abs(Math.cos(node.angle)),
            Math.abs(Math.sin(node.angle))
          );
        }
        width = Math.max(node_width, width);
      });
    return width;
  }
  font_size(attr) {
    if (!arguments.length) return this.font_size;
    this.font_size = attr === undefined ? 12 : attr;
    return this;
  }
  scale_bar_font_size(attr) {
    if (!arguments.length) return this.scale_bar_font_size;
    this.scale_bar_font_size = attr === undefined ? 12 : attr;
    return this;
  }
  node_circle_size(attr, attr2) {
    if (!arguments.length) return this.options["node_circle_size"];
    this.options["node_circle_size"] = constant$1(attr === undefined ? 3 : attr);
    return this;
  }
  css(opt) {
    if (arguments.length === 0) return this.css_classes;
    if (arguments.length > 2) {
      var arg = {};
      arg[opt[0]] = opt[1];
      return this.css(arg);
    }
    for (var key in css_classes) {
      if (key in opt && opt[key] != css_classes[key]) {
        css_classes[key] = opt[key];
      }
    }
    return this;
  }
  transitions(arg) {
    if (arg !== undefined) {
      return arg;
    }
    if (this.options["transitions"] !== null) {
      return this.options["transitions"];
    }
    return this.phylotree.nodes.descendants().length <= 300;
  }
  css_classes(opt, run_update) {
    if (!arguments.length) return this.css_classes;
    let do_update = false;
    for (var key in css_classes) {
      if (key in opt && opt[key] != this.css_classes[key]) {
        do_update = true;
        this.css_classes[key] = opt[key];
      }
    }
    if (run_update && do_update) {
      this.layout();
    }
    return this;
  }
  layout(transitions) {
    if (this.svg) {
      this.svg.selectAll(
        "." +
          this.css_classes["tree-container"] +
          ",." +
          this.css_classes["tree-scale-bar"] +
          ",." +
          this.css_classes["tree-selection-brush"]
      );
      //.remove();
      this.d3PhylotreeTriggerLayout(this);
      return this.update();
    }
    this.d3PhylotreeTriggerLayout(this);
    return this;
  }
  handle_node_click(node) {
    this.nodeDropdownMenu(node, this.container, this, this.options);
  }
  refresh() {
    if (this.svg) {
      // for re-entrancy
      let enclosure = this.svg.selectAll(
        "." + this.css_classes["tree-container"]
      );
      let edges = enclosure
        .selectAll(edgeCssSelectors(this.css_classes))
        .attr("class", this.reclassEdge.bind(this));
      if (this.edge_styler) {
        edges.each(d => {
          this.edge_styler(d3__namespace.select(this), d);
        });
      }
    }
    return this;
  }
  countHandler(attr) {
    if (!arguments.length) return this.count_listener_handler;
    this.count_listener_handler = attr;
    return this;
  }
  style_nodes(attr) {
    if (!arguments.length) return this.node_styler;
    this.node_styler = attr;
    return this;
  }
  style_edges(attr) {
    if (!arguments.length) return this.edge_styler;
    this.edge_styler = attr.bind(this);
    return this;
  }
  itemSelected(item, tag) {
    return item[tag] || false;
  }
  show() {
    return this.svg.node()
  }
}

___namespace.extend(TreeRender.prototype, clades);
___namespace.extend(TreeRender.prototype, render_nodes);
___namespace.extend(TreeRender.prototype, render_edges);
___namespace.extend(TreeRender.prototype, events);
___namespace.extend(TreeRender.prototype, menus);
___namespace.extend(TreeRender.prototype, opt);

function resortChildren(comparator, start_node, filter) {
  // ascending
  this.nodes
    .sum(function(d) {
      return d.value;
    })
    .sort(comparator);
  // if a tree is rendered in the DOM
  if (this.display) {
    this.display.update_layout(this.nodes);
    this.display.update();
  }
  return this;
}

let Phylotree = class {
  constructor(nwk, options = {}) {
    this.newick_string = "";
    this.nodes = [];
    this.links = [];
    this.parsed_tags = [];
    this.partitions = [];
    this.branch_length_accessor = defBranchLengthAccessor;
    this.branch_length = defBranchLengthAccessor;
    this.logger = options.logger || console;
    this.selection_attribute_name = "selected";
    // initialization
    var type = options.type || undefined,
      _node_data = [],
      self = this;
      // If the type is a string, check the parser_registry
    if (___namespace.isString(type)) {
      if (type in format_registry) {
        _node_data = format_registry[type](nwk, options);
      } else {
        // Hard failure
        self.logger.error(
          "type " +
            type +
            " not in registry! Available types are " +
            ___namespace.keys(format_registry)
        );
      }
    } else if (___namespace.isFunction(type)) {
      // If the type is a function, try executing the function
      try {
        _node_data = type(nwk, options);
      } catch (e) {
        // Hard failure
        self.logger.error("Could not parse custom format!");
      }
    } else {
      // this builds children and links;
      if (nwk.name == "root") {
        // already parsed by phylotree.js
        _node_data = { json: nwk, error: null };
      } else if (typeof nwk != "string") {
        // old default
        _node_data = nwk;
      } else if (nwk.contentType == "application/xml") {
        // xml
        _node_data = phyloxml_parser(nwk);
      } else {
        // newick string
        this.newick_string = nwk;
        _node_data = newickParser(nwk, options);
      }
    }
    if (!_node_data["json"]) {
      self.nodes = [];
    } else {
      self.nodes = d3__namespace.hierarchy(_node_data.json);
      // Parse tags
      let _parsed_tags = {};
      self.nodes.each(node => {
        if (node.data.annotation) {
          _parsed_tags[node.data.annotation] = true;
        }
      });
      self.parsed_tags = Object.keys(_parsed_tags);
    }
    self.links = self.nodes.links();
    // If no branch lengths are supplied, set all to 1
    if(!this.hasBranchLengths()) {
      console.warn("Phylotree User Warning : NO BRANCH LENGTHS DETECTED, SETTING ALL LENGTHS TO 1");
      this.setBranchLength(x => 1);
    }
    return self;
  }
  json(traversal_type) {
    var index = 0;
    this.traverse_and_compute(function(n) {
      n.json_export_index = index++;
    }, traversal_type);
    var node_array = new Array(index);
    index = 0;
    this.traverse_and_compute(function(n) {
      let node_copy = ___namespace.clone(n);
      delete node_copy.json_export_index;
      if (n.parent) {
        node_copy.parent = n.parent.json_export_index;
      }
      if (n.children) {
        node_copy.children = ___namespace.map(n.children, function(c) {
          return c.json_export_index;
        });
      }
      node_array[index++] = node_copy;
    }, traversal_type);
    this.traverse_and_compute(function(n) {
      delete n.json_export_index;
    }, traversal_type);
    return JSON.stringify(node_array);
  }
  traverse_and_compute(callback, traversal_type, root_node, backtrack) {
    traversal_type = traversal_type || "post-order";
    function post_order(node) {
      if (___namespace.isUndefined(node)) {
        return;
      }
      postOrder(node, callback, backtrack);
    }
    if (traversal_type == "pre-order") {
      traversal_type = pre_order;
    } else {
      if (traversal_type == "in-order") {
        traversal_type = in_order;
      } else {
        traversal_type = post_order;
      }
    }
    traversal_type(root_node ? root_node : this.nodes);
    function pre_order(node) {
      preOrder(node, callback, backtrack);
    }
    return this;
  }
  get_parsed_tags() {
    return this.parsed_tags;
  }
  update(json) {
    // update with new hiearchy layout
    this.nodes = json;
  }
  // Warning : Requires DOM!
  render(options) {
    this.display = new TreeRender(this, options);
    return this.display;
  }
};

Phylotree.prototype.isLeafNode = isLeafNode;
Phylotree.prototype.hasBranchLengths = hasBranchLengths;
Phylotree.prototype.scaleBranchLengths = scale;
Phylotree.prototype.getNewick = getNewick;
Phylotree.prototype.resortChildren = resortChildren;
Phylotree.prototype.setBranchLength = setBranchLength;

___namespace.extend(Phylotree.prototype, node_operations);
___namespace.extend(Phylotree.prototype, rooting);

exports.phylotree = Phylotree;
Object.defineProperty(exports, '__esModule', { value: true });
})));