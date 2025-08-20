// Mô phỏng liên kết cộng hóa trị của phân tử NH3
// Tác giả: Gemini

let fontRegular;
let playButton, resetButton, instructionsButton, overlapButton, sphereButton, labelButton;
let titleDiv, footerDiv, instructionsPopup;
let atoms = [];
let state = "idle";
let progress = 0;
let bondingProgress = 0;
let cloudRotationAngle = 0;
const slowSpinSpeed = 0.025;
const fastSpinSpeed = 0.3;
const sphereRotationSpeed = 0.02;
let nSphereRotation = 0;
let hSphereRotation = 0;

// Biến trạng thái mới cho nhãn
let showLabels = true;
// Biến trạng thái mới để điều khiển hiển thị lớp cầu
let showSpheres = false;
// Biến trạng thái mới để điều khiển hiển thị đám mây
let showClouds = false;
// Biến trạng thái mới để điều khiển hiển thị 3D
let is3DView = false;
let pyramidTransitionProgress = 0;

// Các tham số cấu hình cho nguyên tử Nito và Hydro
const nInnerRadius = 50; // Bán kính tương đối của vòng electron trong của N
const nOuterRadius = 90; // Bán kính tương đối của vòng electron ngoài cùng của N (Không đổi)
const hOuterRadius = 60; // Bán kính tương đối của vòng electron ngoài cùng của H (Không đổi)
const labelOffset = 30; // Khoảng cách từ nhãn đến lớp ngoài cùng

// Bán kính mới cho đám mây electron (giảm 5 đơn vị, tương ứng với giảm đường kính 10px)
const nCloudRadius = nOuterRadius - 5;
const hCloudRadius = hOuterRadius - 5;


const initialShellGap = 200;
const bondedShellOverlap = 20;
const bondDistance = (nOuterRadius + hOuterRadius) - bondedShellOverlap;

const initialDistance = nOuterRadius + initialShellGap + hOuterRadius;
const sharedElectronSeparation = 18;

let panX = 0;
let panY = 0;
let previousMouseX, previousMouseY;

function preload() {
    fontRegular = loadFont('https://fonts.gstatic.com/s/opensans/v27/mem8YaGs126MiZpBA-UFVZ0e.ttf');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    background(0);
    perspective(PI / 3, width / height, 0.1, 4000);

    smooth();
    textFont(fontRegular);
    textAlign(CENTER, CENTER);
    noStroke();

    titleDiv = createDiv("MÔ PHỎNG LIÊN KẾT CỘNG HOÁ TRỊ NH₃");
    titleDiv.style("position", "absolute");
    titleDiv.style("top", "10px");
    titleDiv.style("width", "100%");
    titleDiv.style("text-align", "center");
    titleDiv.style("font-size", "18px");
    titleDiv.style("color", "#fff");
    titleDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
    titleDiv.style("font-family", "Arial");

    footerDiv = createDiv("© HÓA HỌC ABC");
    footerDiv.style("position", "absolute");
    footerDiv.style("bottom", "10px");
    footerDiv.style("width", "100%");
    footerDiv.style("text-align", "center");
    footerDiv.style("font-size", "16px");
    footerDiv.style("color", "#fff");
    footerDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
    footerDiv.style("font-family", "Arial");

    createUI();
    resetSimulation();
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function createUI() {
    playButton = createButton("▶ Play");
    styleButton(playButton);
    playButton.mousePressed(() => {
        if (state === "idle") {
            state = "animating";
            // Tắt mọi hiển thị phụ khi bắt đầu mô phỏng
            showSpheres = false;
            showClouds = false;
            is3DView = false;
            sphereButton.html("Bật lớp cầu");
            overlapButton.html("Bật xen phủ");
        }
    });

    resetButton = createButton("↺ Reset");
    styleButton(resetButton);
    resetButton.mousePressed(() => {
        resetSimulation();
    });

    overlapButton = createButton("Bật xen phủ");
    styleButton(overlapButton);
    overlapButton.mousePressed(() => {
        if (state === "done") {
            showClouds = !showClouds;
            if (showClouds) {
                showSpheres = false;
                is3DView = false;
                overlapButton.html("Tắt xen phủ");
                sphereButton.html("Bật lớp cầu");
            } else {
                overlapButton.html("Bật xen phủ");
            }
        }
    });

    sphereButton = createButton("Bật lớp cầu");
    styleButton(sphereButton);
    sphereButton.mousePressed(() => {
        if (state !== "animating" && state !== "bonding") {
            showSpheres = !showSpheres;
            if (showSpheres) {
                showClouds = false;
                is3DView = true;
                pyramidTransitionProgress = 0; // Bắt đầu quá trình chuyển đổi
                sphereButton.html("Tắt lớp cầu");
                overlapButton.html("Bật xen phủ");
            } else {
                is3DView = false;
                pyramidTransitionProgress = 0; // Đặt lại tiến trình
                sphereButton.html("Bật lớp cầu");
            }
        }
    });
    
    labelButton = createButton("Tắt nhãn");
    styleButton(labelButton);
    labelButton.mousePressed(() => {
        showLabels = !showLabels;
        if (showLabels) {
            labelButton.html("Tắt nhãn");
        } else {
            labelButton.html("Bật nhãn");
        }
    });

    instructionsButton = createButton("Hướng dẫn");
    styleInstructionsButton(instructionsButton);
    instructionsButton.mousePressed(() => {
        instructionsPopup.style('display', 'block');
    });

    instructionsPopup = createDiv();
    instructionsPopup.id('instructions-popup');
    instructionsPopup.style('position', 'fixed');
    instructionsPopup.style('top', '50%');
    instructionsPopup.style('left', '50%');
    instructionsPopup.style('transform', 'translate(-50%, -50%)');
    instructionsPopup.style('background-color', 'rgba(0, 0, 0, 0.85)');
    instructionsPopup.style('border-radius', '12px');
    instructionsPopup.style('padding', '20px');
    instructionsPopup.style('color', '#fff');
    instructionsPopup.style('font-family', 'Arial');
    instructionsPopup.style('z-index', '1000');
    instructionsPopup.style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.2)');
    instructionsPopup.style('display', 'none');

    let popupContent = `
        <h2 style="font-size: 24px; margin-bottom: 15px; text-align: center;">Hướng dẫn sử dụng</h2>
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 10px;">• Nhấn nút "Play" để bắt đầu quá trình mô phỏng liên kết cộng hóa trị.</li>
            <li style="margin-bottom: 10px;">• Sau khi mô phỏng hoàn tất, bạn có thể sử dụng chuột để xoay và xem mô hình từ các góc khác nhau.</li>
            <li style="margin-bottom: 10px;">• Giữ phím **Ctrl** và kéo chuột trái để di chuyển toàn bộ mô hình trên màn hình.</li>
            <li style="margin-bottom: 10px;">• Sử dụng con lăn chuột để phóng to hoặc thu nhỏ.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "Reset" để quay lại trạng thái ban đầu.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "Bật xen phủ" để hiển thị đám mây electron liên kết.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "Bật lớp cầu" để hiển thị lớp electron hóa trị dưới dạng mặt cầu.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "Bật/Tắt nhãn" để hiển thị/ẩn tên nguyên tử.</li>
        </ul>
        <button id="closePopup" style="display: block; width: 100%; padding: 10px; margin-top: 20px; font-size: 16px; border: none; border-radius: 6px; background-color: #36d1dc; color: #fff; cursor: pointer;">Đóng</button>
    `;
    instructionsPopup.html(popupContent);

    document.getElementById('closePopup').addEventListener('click', () => {
        instructionsPopup.style('display', 'none');
    });

    positionButtons();
}

function styleButton(btn) {
    btn.style("width", "80px");
    btn.style("height", "30px");
    btn.style("padding", "0px");
    btn.style("font-size", "12px");
    btn.style("border-radius", "6px");
    btn.style("color", "#fff");
    btn.style("cursor", "pointer");
    btn.style("transition", "all 0.2s ease-in-out");
    btn.style("font-family", "Arial");
    btn.style("box-shadow", "none");
    btn.style("transform", "scale(1)");
    btn.style("border", "none");
    btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    
    btn.mouseOver(() => {
        btn.style("background", "linear-gradient(145deg, #fc5c7d, #6a82fb)");
    });
    btn.mouseOut(() => {
        btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    });
    btn.mousePressed(() => {
        btn.style("background", "#36d1dc");
        btn.style("transform", "scale(0.95)");
    });
    btn.mouseReleased(() => {
        btn.style("background", "linear-gradient(145deg, #fc5c7d, #6a82fb)");
        btn.style("transform", "scale(1)");
    });
}

function styleInstructionsButton(btn) {
    btn.style("width", "80px");
    btn.style("height", "30px");
    btn.style("padding", "0px");
    btn.style("font-size", "12px");
    btn.style("border-radius", "6px");
    btn.style("color", "#fff");
    btn.style("cursor", "pointer");
    btn.style("transition", "all 0.2s ease-in-out");
    btn.style("font-family", "Arial");
    btn.style("box-shadow", "none");
    btn.style("transform", "scale(1)");
    btn.style("background", "rgba(0,0,0,0)");
    btn.style("border", "1px solid #fff");
    
    btn.mouseOver(() => {
        btn.style("background", "#fff");
        btn.style("color", "#000");
    });
    btn.mouseOut(() => {
        btn.style("background", "rgba(0,0,0,0)");
        btn.style("color", "#fff");
    });
    btn.mousePressed(() => {
        btn.style("background", "#36d1dc");
        btn.style("color", "#fff");
        btn.style("transform", "scale(0.95)");
    });
    btn.mouseReleased(() => {
        btn.style("background", "#fff");
        btn.style("color", "#000");
        btn.style("transform", "scale(1)");
    });
}

function positionButtons() {
    playButton.position(20, 20);
    resetButton.position(20, 60);
    overlapButton.position(20, 100);
    sphereButton.position(20, 140);
    labelButton.position(20, 180);
    instructionsButton.position(20, 220);
}

function resetSimulation() {
    atoms = [];
    atoms.push(new Atom(0, 0, "N", 7, [2, 5], color(0, 191, 255)));

    const hInitialPositions = [
        createVector(-initialDistance, 0, 0),
        createVector(initialDistance, 0, 0),
        createVector(0, initialDistance, 0)
    ];

    const bondAngle = radians(107.8);
    const zOffset = bondDistance * cos(PI - bondAngle / 2);
    const radiusOfBase = bondDistance * sin(PI - bondAngle / 2);
    
    const hFinalPositions3D = [
        createVector(radiusOfBase * cos(radians(0)), radiusOfBase * sin(radians(0)), zOffset),
        createVector(radiusOfBase * cos(radians(120)), radiusOfBase * sin(radians(120)), zOffset),
        createVector(radiusOfBase * cos(radians(240)), radiusOfBase * sin(radians(240)), zOffset)
    ];

    atoms.push(new Atom(hInitialPositions[0].x, hInitialPositions[0].y, "H", 1, [1], color(255, 255, 255), hFinalPositions3D[0]));
    atoms.push(new Atom(hInitialPositions[1].x, hInitialPositions[1].y, "H", 1, [1], color(255, 255, 255), hFinalPositions3D[1]));
    atoms.push(new Atom(hInitialPositions[2].x, hInitialPositions[2].y, "H", 1, [1], color(255, 255, 255), hFinalPositions3D[2]));

    state = "idle";
    progress = 0;
    bondingProgress = 0;
    cloudRotationAngle = 0;
    nSphereRotation = 0;
    hSphereRotation = 0;
    panX = 0;
    panY = -100;
    previousMouseX = mouseX;
    previousMouseY = mouseY;
    pyramidTransitionProgress = 0;

    showClouds = false;
    showSpheres = false;
    is3DView = false;
    overlapButton.html("Bật xen phủ");
    sphereButton.html("Bật lớp cầu");
    
    showLabels = true;
    labelButton.html("Tắt nhãn");
}

function draw() {
    background(0);

    if (keyIsDown(17) && mouseIsPressed) {
        panX += (mouseX - pmouseX);
        panY += (mouseY - pmouseY);
        previousMouseX = mouseX;
        previousMouseY = mouseY;
    } else {
        orbitControl();
    }

    translate(panX, panY);

    ambientLight(80);
    pointLight(255, 255, 255, 0, 0, 300);

    const nAtom = atoms.find(a => a.label === "N");
    const hAtoms = atoms.filter(a => a.label === "H");

    if (state === "animating") {
        progress += 0.01;
        let t_move = easeInOutQuad(progress);

        if (progress >= 1) {
            progress = 1;
            state = "bonding";
        }

        hAtoms.forEach(hAtom => {
            const initialPos = hAtom.initialPos;
            const finalPos = hAtom.finalPos;
            hAtom.pos.x = lerp(initialPos.x, finalPos.x, t_move);
            hAtom.pos.y = lerp(initialPos.y, finalPos.y, t_move);
        });

    } else if (state === "bonding") {
        bondingProgress += 0.02;
        if (bondingProgress >= 1) {
            bondingProgress = 1;
            state = "done";
        }
    }
    
    if (is3DView && state === "done") {
        if (pyramidTransitionProgress < 1) {
            pyramidTransitionProgress += 0.02; // Tốc độ chuyển đổi
        } else {
            pyramidTransitionProgress = 1;
        }
        let t_pyramid = easeInOutQuad(pyramidTransitionProgress);
        hAtoms.forEach(hAtom => {
            hAtom.pos = p5.Vector.lerp(hAtom.donePos, hAtom.pyramidPos, t_pyramid);
        });
    } else if (!is3DView && state === "done") {
        if (pyramidTransitionProgress > 0) {
            pyramidTransitionProgress -= 0.02;
        } else {
            pyramidTransitionProgress = 0;
        }
        let t_pyramid = easeInOutQuad(pyramidTransitionProgress);
        hAtoms.forEach(hAtom => {
            hAtom.pos = p5.Vector.lerp(hAtom.donePos, hAtom.pyramidPos, t_pyramid);
        });
    }

    if (showClouds) {
        cloudRotationAngle += fastSpinSpeed;
    }
    if (showSpheres) {
        nSphereRotation += sphereRotationSpeed;
        hSphereRotation += sphereRotationSpeed;
    }

    for (let atom of atoms) {
        push();
        translate(atom.pos.x, atom.pos.y, atom.pos.z);
        atom.show(bondingProgress, state);
        pop();
    }
    
    if (state !== "idle" && state !== "animating" && !showSpheres) {
        drawBondingElectrons();
    }

    if (showClouds) {
        drawElectronClouds();
    }
    if (showSpheres) {
        drawElectronSpheres();
    }

    if (showLabels) {
        drawLabels();
    }
}

function drawLabels() {
    const nAtom = atoms.find(a => a.label === "N");
    const hAtoms = atoms.filter(a => a.label === "H");
    
    if (!nAtom || hAtoms.length === 0) return;

    drawBillboardText(nAtom.label, nAtom.pos.x, nAtom.pos.y + nOuterRadius + labelOffset, nAtom.pos.z);
    
    hAtoms.forEach(hAtom => {
        drawBillboardText(hAtom.label, hAtom.pos.x, hAtom.pos.y + hOuterRadius + labelOffset, hAtom.pos.z);
    });
}

function drawBillboardText(textStr, x, y, z) {
    push();
    translate(x, y, z);
    const orbitCam = p5.instance._curCamera;
    if (orbitCam) {
        rotateX(-orbitCam.cameraX);
        rotateY(-orbitCam.cameraY);
    }
    fill(255);
    textSize(20);
    text(textStr, 0, 0);
    pop();
}

function drawBondingElectrons() {
    if (state === "bonding" || state === "done") {
        const electronSize = 6;
        let t_bonding = easeInOutQuad(bondingProgress);

        const nAtom = atoms.find(a => a.label === "N");
        const hAtoms = atoms.filter(a => a.label === "H");

        if (!nAtom) return;

        let bondingElectrons_N = nAtom.shells.at(-1).filter(e => e.isShared);
        
        for(let i=0; i<hAtoms.length; i++) {
            let h = hAtoms[i];
            let e_H = h.shells.at(-1).find(el => el.isShared);
            
            let e_N;
            if(h.initialPos.x < 0) e_N = bondingElectrons_N.find(e => abs(degrees(e.angle) - 180) < 1);
            else if(h.initialPos.x > 0) e_N = bondingElectrons_N.find(e => abs(degrees(e.angle) - 0) < 1);
            else e_N = bondingElectrons_N.find(e => abs(degrees(e.angle) - 90) < 1);
            
            if(e_N) {
                let bondingPoint = getOverlapCenter(nAtom.pos, h.pos);

                let dirVector = p5.Vector.sub(h.pos, nAtom.pos).normalize();

                let perpVector;
                if (is3DView) {
                    perpVector = dirVector.cross(createVector(0,0,1)).normalize();
                } else {
                    perpVector = createVector(-dirVector.y, dirVector.x, 0);
                }
                
                let finalPos_N = p5.Vector.add(bondingPoint, p5.Vector.mult(perpVector, sharedElectronSeparation / 2));
                let finalPos_H = p5.Vector.add(bondingPoint, p5.Vector.mult(perpVector, -sharedElectronSeparation / 2));

                let pos_N = p5.Vector.lerp(e_N.initialPos, finalPos_N, t_bonding);
                let pos_H = p5.Vector.lerp(e_H.initialPos, finalPos_H, t_bonding);

                push();
                translate(pos_N.x, pos_N.y, pos_N.z);
                fill(nAtom.electronCol);
                sphere(electronSize);
                pop();
                
                push();
                translate(pos_H.x, pos_H.y, pos_H.z);
                fill(h.electronCol);
                sphere(electronSize);
                pop();
            }
        }
    }
}

function getOverlapCenter(nPos, hPos) {
    const totalDistance = p5.Vector.dist(nPos, hPos);
    const overlapStartFromN = totalDistance - hOuterRadius;
    const overlapEndFromN = nOuterRadius;
    const overlapMidPoint = (overlapStartFromN + overlapEndFromN) / 2;
    const dirVector = p5.Vector.sub(hPos, nPos).normalize();
    return p5.Vector.add(nPos, p5.Vector.mult(dirVector, overlapMidPoint));
}

function drawElectronClouds() {
    const nAtom = atoms.find(a => a.label === "N");
    const hAtoms = atoms.filter(a => a.label === "H");

    const orbitalWidth = 12;

    let nColor = nAtom.electronCol;
    let hColor = hAtoms[0].electronCol;
    let blendedColor = lerpColor(nColor, hColor, 0.5);
    blendedColor.setAlpha(255);

    push();
    translate(nAtom.pos.x, nAtom.pos.y, nAtom.pos.z);
    // Sử dụng ma trận để xoay liên tục
    rotateZ(cloudRotationAngle);
    noStroke();
    fill(blendedColor);
    torus(nCloudRadius, orbitalWidth, 12, 12);
    pop();

    hAtoms.forEach(hAtom => {
        push();
        translate(hAtom.pos.x, hAtom.pos.y, hAtom.pos.z);
        // Sử dụng ma trận để xoay liên tục
        rotateZ(cloudRotationAngle);
        noStroke();
        fill(blendedColor);
        torus(hCloudRadius, orbitalWidth, 12, 12);
        pop();
    });
}

function drawElectronSpheres() {
    const nAtom = atoms.find(a => a.label === "N");
    const hAtoms = atoms.filter(a => a.label === "H");

    const nOrbitalRadius = nOuterRadius;
    const hOrbitalRadius = hOuterRadius;
    const detail = 60;
    
    // Nito
    push();
    translate(nAtom.pos.x, nAtom.pos.y, nAtom.pos.z);
    rotateY(nSphereRotation);
    noStroke();
    fill(nAtom.electronCol);
    sphere(nOrbitalRadius, detail, detail);
    pop();
    
    // Hydro
    hAtoms.forEach(hAtom => {
        push();
        translate(hAtom.pos.x, hAtom.pos.y, hAtom.pos.z);
        rotateY(hSphereRotation);
        noStroke();
        fill(hAtom.electronCol);
        sphere(hOrbitalRadius, detail, detail);
        pop();
    });
}

class Atom {
    constructor(x, y, label, protons, shellCounts, electronCol, pyramidPos = null) {
        this.pos = createVector(x, y, 0);
        this.initialPos = createVector(x, y, 0);
        this.label = label;
        this.protons = protons;
        this.shells = [];
        this.shellRadii = [];
        
        this.electronCol = electronCol;
        this.otherElectronCol = (this.label === "H") ? color(0, 191, 255) : color(255, 255, 255);
        this.isBonded = false;
        
        if (this.label === "H") {
            const hCount = atoms.filter(a => a.label === "H").length;
            this.labelId = hCount;
        }

        if (this.label === "N") {
            this.shellRadii.push(nInnerRadius);
            let innerShellElectrons = [];
            for (let j = 0; j < 2; j++) {
                innerShellElectrons.push({
                    angle: (TWO_PI / 2) * j,
                    col: this.electronCol,
                    isShared: false,
                    initialPos: null
                });
            }
            this.shells.push(innerShellElectrons);

            this.shellRadii.push(nOuterRadius);
            let outerShellElectrons = [];
            
            const nonBondingPairAngles = [radians(270) - radians(10), radians(270) + radians(10)];
            const bondingPairAngles = [radians(180), radians(0), radians(90)];
            
            outerShellElectrons.push({ angle: bondingPairAngles[0], col: this.electronCol, isShared: true, initialPos: null });
            outerShellElectrons.push({ angle: bondingPairAngles[1], col: this.electronCol, isShared: true, initialPos: null });
            outerShellElectrons.push({ angle: bondingPairAngles[2], col: this.electronCol, isShared: true, initialPos: null });
            outerShellElectrons.push({ angle: nonBondingPairAngles[0], col: this.electronCol, isShared: false, initialPos: null });
            outerShellElectrons.push({ angle: nonBondingPairAngles[1], col: this.electronCol, isShared: false, initialPos: null });
            
            this.shells.push(outerShellElectrons);
        } else {
            this.shellRadii.push(hOuterRadius);
            let shellElectrons = [];
            for (let j = 0; j < shellCounts[0]; j++) {
                shellElectrons.push({
                    angle: (TWO_PI / shellCounts[0]) * j,
                    col: electronCol,
                    isShared: true,
                    initialPos: null
                });
            }
            this.shells.push(shellElectrons);
        }
        
        if (this.label === "H") {
            this.finalPos = p5.Vector.mult(p5.Vector.sub(createVector(0,0,0), this.initialPos).normalize(), -bondDistance);
            this.donePos = this.finalPos.copy();
            this.pyramidPos = pyramidPos;
        }
    }

    show(bondingProgress, state) {
        push();
        fill(255, 0, 0);
        let nucleusSize = (this.label === "H") ? 20 : 30;
        sphere(nucleusSize);

        push();
        fill(255, 255, 0);
        textSize(16);
        let offsetX = (this.label === "H") ? 0 : 0;
        translate(offsetX, 0, nucleusSize + 1);
        text("+" + this.protons, 0, 0);
        pop();
        pop();
        
        if (!showSpheres) {
            for (let i = 0; i < this.shells.length; i++) {
                if (!(this.label === "N" && i === this.shells.length - 1 && showClouds)) {
                    noFill();
                    stroke(255);
                    strokeWeight(1);
                    let radius = this.shellRadii[i];
                    push();
                    drawSmoothCircle(radius);
                    pop();
                }
            }
            noStroke();

            const electronSize = 6;
            
            if (state === "bonding" || state === "done") {
                let t_bonding = easeInOutQuad(bondingProgress);

                if(this.label === "N") {
                    let innerShell = this.shells[0];
                    for (let j = 0; j < innerShell.length; j++) {
                        let e = innerShell[j];
                        let angle = (TWO_PI / innerShell.length) * j + (frameCount * slowSpinSpeed);
                        let ex = cos(angle) * this.shellRadii[0];
                        let ey = sin(angle) * this.shellRadii[0];
                        push();
                        translate(ex, ey, 0);
                        fill(e.col);
                        sphere(electronSize);
                        pop();
                    }
                }

                if (this.label === "N" && !showClouds) {
                    let nonSharedElectrons = this.shells.at(-1).filter(el => !el.isShared);
                    if (nonSharedElectrons.length > 0) {
                        const nonBondingPairAngles = [radians(270) - radians(10), radians(270) + radians(10)];
                        
                        for(let j = 0; j < nonSharedElectrons.length; j++){
                            let e = nonSharedElectrons[j];
                            let finalAngle = nonBondingPairAngles[j];
                            let ex = cos(finalAngle) * this.shellRadii.at(-1);
                            let ey = sin(finalAngle) * this.shellRadii.at(-1);
                            push();
                            translate(ex, ey, 0);
                            fill(e.col);
                            sphere(electronSize);
                            pop();
                        }
                    }
                }
            } else {
                for (let i = 0; i < this.shells.length; i++) {
                    let radius = this.shellRadii[i];
                    for (let j = 0; j < this.shells[i].length; j++) {
                        let e = this.shells[i][j];
                        let angle = (TWO_PI / this.shells[i].length) * j + (frameCount * slowSpinSpeed);
                        let ex = cos(angle) * radius;
                        let ey = sin(angle) * radius;
                        
                        e.initialPos = createVector(this.pos.x + ex, this.pos.y + ey, 0);
                        
                        push();
                        translate(ex, ey, 0);
                        fill(e.col);
                        sphere(electronSize);
                        pop();
                    }
                }
            }
        }
    }
}

function drawSmoothCircle(radius) {
    let numPoints = 200;
    beginShape();
    for (let i = 0; i < numPoints; i++) {
        let angle = map(i, 0, numPoints, 0, TWO_PI);
        let x = radius * cos(angle);
        let y = radius * sin(angle);
        vertex(x, y);
    }
    endShape(CLOSE);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    perspective(PI / 3, windowWidth / windowHeight, 0.1, 4000);
    positionButtons();
}