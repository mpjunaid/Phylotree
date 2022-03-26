function preprocess_tree(tree){
    if (tree.hasOwnProperty('newick_string')) {
        if (tree.nodes.hasOwnProperty('children')) {
            leaf = []
            tree.nodes.leaves=getleaf(tree);
            const len=tree.nodes.children.length;
            for (let i=0;i<len;i=i+1) {
              preprocess_tree(tree.nodes.children[i]);
            }
        }
    }
    else if (tree.hasOwnProperty('children')) {
        leaf = []
        tree.leaves=getleaf(tree);
        const len=tree.children.length;
        for (let i=0;i<len;i=i+1) {
            preprocess_tree(tree.children[i]); 
        }
    }
    return tree;
}
      
function getleaf(tree) {
    if (tree.hasOwnProperty('newick_string')) {
        if (tree.nodes.hasOwnProperty('children')) {
            const len=tree.nodes.children.length;
            for (let i=0;i<len;i=i+1) {
              getleaf(tree.nodes.children[i]);
            }
        }
        else {
            leaf.push(tree.nodes.data.name);
        }
    }
    else if (tree.hasOwnProperty('children')) {
        const len=tree.children.length;
        for (let i=0;i<len;i=i+1) {
            getleaf(tree.children[i]);
        }
    } else {
        leaf.push(tree.data.name);
    }
    return leaf;
}
      
function preprocess_BCN(v, tree) {
    v = preprocess_tree(v);
    tree = preprocess_tree(tree);
    if (v.hasOwnProperty('newick_string')) {
        if (v.nodes.hasOwnProperty('children')) {
            getBCN(v, tree);
            const len=v.nodes.children.length;
            for (let i=0;i<len;i=i+1) {      
              preprocess_BCN(v.nodes.children[i], tree); 
            }
        }
    } else if (v.hasOwnProperty('children')) {
        getBCN(v, tree);
        const len=v.children.length;
        for (let i=0;i<len;i=i+1) {      
            preprocess_BCN(v.children[i], tree); 
        }
    }
}
      
function getBCN(v, tree) {
    var elementBCNNode = null;
    var maxElementS = 0;
    var spanningTree = getSpanningTree(tree, v);
    for (var i = 0; i < spanningTree.length; i++) {
        var x = getElementS(v, spanningTree[i]);
        if (x > maxElementS) {
            maxElementS = x;
            elementBCNNode = spanningTree[i];
        }
    } 
    if (v.hasOwnProperty('newick_string')) {
        v.nodes.BCN = elementBCNNode;
        v.nodes.score = maxElementS;
    } else {
        v.BCN = elementBCNNode;
        v.score = maxElementS;
    }
}
      
function getSpanningTree(tree, node) {
    var nodes = [];
    if (tree.hasOwnProperty('newick_string') && node.hasOwnProperty('newick_string')) {
        if(tree.nodes.hasOwnProperty('children')) {
            len = tree.nodes.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree.nodes.leaves[i], node.nodes.leaves);
            if (test > -1) {
                nodes.push(tree);
                var children = tree.nodes.children;
              for (var j = 0; j < children.length; j++) {
                  nodes = nodes.concat(getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
    } else if (tree.hasOwnProperty('newick_string')) {
        if(tree.nodes.hasOwnProperty('children')) {
            len = tree.nodes.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree.nodes.leaves[i], node.leaves);
            if (test > -1) {
                nodes.push(tree);
                var children = tree.nodes.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
    } else if (node.hasOwnProperty('newick_string')) {
        if(tree.hasOwnProperty('children')) {
            len = tree.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree.leaves[i], node.nodes.leaves);
            if (test > -1) {
                nodes.push(tree);
                var children = tree.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
    } else {
        if (tree.hasOwnProperty('children')) {
            len = tree.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree.leaves[i], node.leaves);
            if (test > -1) {
                nodes.push(tree);
                var children = tree.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
    }
    return nodes;
}
      
function getElementS(v, n) {
    if (v.hasOwnProperty('newick_string') && n.hasOwnProperty('newick_string')) {
        var lv = v.nodes.leaves;
        var ln = n.nodes.leaves;
    } else if (v.hasOwnProperty('newick_string')) {
        var lv = v.nodes.leaves;
        var ln = n.leaves;
    } else if (n.hasOwnProperty('newick_string')) {
        var lv = v.leaves;
        var ln = n.nodes.leaves;
    } else {
        var lv = v.leaves;
        var ln = n.leaves;    
    }
    var lvlen = lv ? lv.length : 0;
    var lnlen = ln ? ln.length : 0;
    var intersect = _.intersection(lv, ln).length;
    return intersect / (lvlen + lnlen - intersect);
}

