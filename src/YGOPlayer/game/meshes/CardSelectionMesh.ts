import * as THREE from 'three';

export function createCardSelectionGeometry(width: number = 2.5, height: number = 3, borderSize: number = 1): THREE.ShapeGeometry {
    const shape = new THREE.Shape();

    // Outer rectangle (the plane's boundary)
    shape.moveTo(-width / 2, -height / 2); // Start at bottom-left
    shape.lineTo(width / 2, -height / 2);  // Move to bottom-right
    shape.lineTo(width / 2, height / 2);   // Move to top-right
    shape.lineTo(-width / 2, height / 2);  // Move to top-left
    shape.lineTo(-width / 2, -height / 2); // Close the shape to the starting point

    // Inner hole (creating a border around the plane)
    const hole = new THREE.Path();
    hole.moveTo(-width / 2 + borderSize, -height / 2 + borderSize); // Start inside the rectangle, considering the border size
    hole.lineTo(width / 2 - borderSize, -height / 2 + borderSize);   // Move right
    hole.lineTo(width / 2 - borderSize, height / 2 - borderSize);    // Move up
    hole.lineTo(-width / 2 + borderSize, height / 2 - borderSize);   // Move left
    hole.lineTo(-width / 2 + borderSize, -height / 2 + borderSize);  // Close the hole

    shape.holes.push(hole);

    return new THREE.ShapeGeometry(shape);
}
