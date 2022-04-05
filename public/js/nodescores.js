/* Go over all nodes in the tree and assign for every node a list of the leaf names */
function preprocess_tree(tree) {
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
}

/* Return list of leave names for a node */      
function getleaf(node) {
    if (node.hasOwnProperty('newick_string')) {
        if (node.nodes.hasOwnProperty('children')) {
            const len = node.nodes.children.length;
            for (let i = 0; i < len; i++) {
              getleaf(node.nodes.children[i]);
            }
        } else {
            leaf.push(node.nodes.data.name);
        }
    } else if (node.hasOwnProperty('children')) {
        const len = node.children.length;
        for (let i = 0; i < len; i++) {
            getleaf(node.children[i]);
        }
    } else {
        leaf.push(node.data.name);
    }
    return leaf;
}

/* Go over all nodes in the tree and assign for every node the node score and BCN */
function preprocess_BCN(tree, tree_ref) {
    preprocess_tree(tree);
    preprocess_tree(tree_ref);
    if (tree.hasOwnProperty('newick_string')) {
        if (tree.nodes.hasOwnProperty('children')) {
            getBCN(tree, tree_ref);
            const len = tree.nodes.children.length;
            for (let i = 0; i < len; i++) {      
              preprocess_BCN(tree.nodes.children[i], tree_ref); 
            }
        }
    } else if (tree.hasOwnProperty('children')) {
        getBCN(tree, tree_ref);
        const len = tree.children.length;
        for (let i = 0; i < len; i++) {      
            preprocess_BCN(tree.children[i], tree_ref); 
        }
    }
}

/* Calculate the nodescore and BCN for a node and its reference tree */
function getBCN(node, tree_ref) {
    var elementBCNNode = null;
    var maxElementS = 0;
    var spanningTree = getSpanningTree(node, tree_ref); 
    for (var i = 0; i < spanningTree.length; i++) {
        var x = getElementS(node, spanningTree[i]);
        if (x > maxElementS) {
            maxElementS = x;
            elementBCNNode = spanningTree[i];
        }
    } 
    if (node.hasOwnProperty('newick_string')) {
        node.nodes.BCN = elementBCNNode;
        node.nodes.score = maxElementS;
        if (elementBCNNode.hasOwnProperty('newick_string')) {
            node.nodes.BCN_Depth = elementBCNNode.nodes.depth
        } else {
            node.nodes.BCN_Depth = elementBCNNode.depth
        }
    } else {
        node.BCN = elementBCNNode;
        node.score = maxElementS;
        if (elementBCNNode.hasOwnProperty('newick_string')) {
            node.BCN_Depth = elementBCNNode.nodes.depth
        } else {
            node.BCN_Depth = elementBCNNode.depth
        }
    }
}

/* Return list of nodes of the reference tree who have leaves in common with the node */
function getSpanningTree(node, tree_ref) {
    var nodes = [];
    if (node.hasOwnProperty('newick_string') && tree_ref.hasOwnProperty('newick_string')) {
        if (tree_ref.nodes.hasOwnProperty('children')) {
            len = tree_ref.nodes.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree_ref.nodes.leaves[i], node.nodes.leaves);
            if (test > -1) {
                nodes.push(tree_ref);
                var children = tree_ref.nodes.children;
              for (var j = 0; j < children.length; j++) {
                  nodes = nodes.concat(getSpanningTree(node, children[j]));
                }
                return nodes;
            }
        }
    } else if (tree_ref.hasOwnProperty('newick_string')) {
        if (tree_ref.nodes.hasOwnProperty('children')) {
            len = tree_ref.nodes.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree_ref.nodes.leaves[i], node.leaves);
            if (test > -1) {
                nodes.push(tree_ref);
                var children = tree_ref.nodes.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(node, children[j]));
                }
                return nodes;
            }
        }
    } else if (node.hasOwnProperty('newick_string')) {
        if (tree_ref.hasOwnProperty('children')) {
            len = tree_ref.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree_ref.leaves[i], node.nodes.leaves);
            if (test > -1) {
                nodes.push(tree_ref);
                var children = tree_ref.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(node, children[j]));
                }
                return nodes;
            }
        }
    } else {
        if (tree_ref.hasOwnProperty('children')) {
            len = tree_ref.leaves.length;
        } else { len = 0;}
        for (var i = 0; i < len; i++) {
            var test = $.inArray(tree_ref.leaves[i], node.leaves);
            if (test > -1) {
                nodes.push(tree_ref);
                var children = tree_ref.children;
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(node, children[j]));
                }
                return nodes;
            }
        }
    }
    return nodes;
}

/* Get the node score between two nodes */
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