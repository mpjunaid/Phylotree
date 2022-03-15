/**
 * Source: https://github.com/DessimozLab/phylo-io/blob/master/www/js/treecompare.js
 * 
 * leaves:  getTips (all leaves from a node)
 * deepLeafList: getTips (all leaves from root)
 */

import { assignAttributes } from "./phylotree.js";
//import assignAttributes from phylotree
//import getTips from phylotree.js;
//import assignAttributes from phylotree.js;
//import name from phylotree.js;
//import getChildren from phylotree.js;


function compareTree(tree_1, tree_2) {
    tree_1.traverse_and_compute(function(node) {
        const nodeScore = {
            nodeName: node.name,
            nodeValue: getBCN(node, tree_2.root)
          };
        assignAttributes(nodeScore);
    });
}

function getBCN(v, tree) {

    var elementBCNNode = null;
    var maxElementS = 0;
    var spanningTree = getSpanningTree(tree, v);

    for (var i = 0; i < spanningTree.length; i++) {
        //get elementBCN for node v
        var x = getElementS(v, spanningTree[i]);
        if (x > maxElementS) {
            maxElementS = x;
            elementBCNNode = spanningTree[i];
        }
    }
    return maxElementS;
    //v.elementS = maxElementS; Maybe add later
}


function getSpanningTree(tree, node) {
    var nodes = [];
    for (var i = 0; i < tree.getTips.length; i++) {
        var test = $.inArray(tree.getTips[i].name, node.getTips);
        if (test > -1){
            nodes.push(tree);
            var children = getChildren(tree);
            for (var j = 0; j < children.length; j++) {
                nodes = nodes.concat(getSpanningTree(children[j], node));
            }
            return nodes;
        }
    }
    return nodes;
}

function getElementS(v, n) {
    var lv = v.getTips();
    var ln = n.getTips();

    var lvlen = lv ? lv.length : 0;
    var lnlen = ln ? ln.length : 0;

    var intersect = _.intersection(lv, ln).length;
    return intersect / (lvlen + lnlen - intersect);
}

