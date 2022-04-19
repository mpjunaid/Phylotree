count=0;
height=0;
depth=0;
node=0;
leaf=0;
function average(tree){

    if (tree.hasOwnProperty('children')) {
        const len = tree.children.length;
        count=count+1
        height=height+tree.height
        depth=depth+tree.depth
        node=node+1
        // console.log(tree.height,tree.depth)
        for (let i = 0; i < len; i++) {
            average(tree.children[i]);
        }
        
    } else {
        count=count+1
        height=height+tree.height
        depth=depth+tree.depth
        leaf=leaf+1
        // console.log(tree.height,tree.depth)
    }

    // console.log(tree)
    return true
}

function average_val(tree){
    count=0;
    height=0;
    depth=0;
    node=0;
    leaf=0;
    console.log(count,depth,height)
    average(tree)
    console.log(count,depth,height)
    return [height/count,depth/count,node,leaf]

}