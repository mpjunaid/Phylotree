/* Create newick string from tree */
function new_tree(tree) {
    if (tree.hasOwnProperty('children')) {
        const len = tree.children.length;
        if(tree.score == 1) { 
            newick += "(";
            for (let i = 0; i < len; i++){
                if(tree.children[i].hasOwnProperty('children')) {
                } else {
                    newick += tree.children[i].data.name;
                    if(i != len) {newick += ",";}
                }
            }       
        }
        for (let i = 0;i < len; i++) {
            new_tree(tree.children[i]); 
        } 
        if(tree.score==1) {
            last = newick.charAt(newick.length - 1);
            if(last==',') {
                newick=newick.slice(0, -1)
            }
            newick += ")";
            newick += ",";
        }
    }
    return newick
}

/* Create intersection newick string from tree */
function create_intersection(tree) {
    let intersection = '(';
    intersection += new_tree(tree.nodes);
    intersection = intersection.slice(0, -1);
    intersection += ");";
    return intersection
}