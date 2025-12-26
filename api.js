const Channel = {
    NOTE_ON: 0x90,
    NOTE_ON_FLASHING: 0x91,
    NOTE_ON_PULSING: 0x92,
};

const UserMode =
[[91, 92, 93, 94, 95, 96, 97, 98, 99],
 [64, 65, 66, 67, 96, 97, 98, 99, 89],
 [60, 61, 62, 63, 92, 93, 94, 95, 79],
 [56, 57, 58, 59, 88, 89, 90, 91, 69],
 [52, 53, 54, 55, 84, 85, 86, 87, 59],
 [48, 49, 50, 51, 80, 81, 82, 83, 49],
 [44, 45, 46, 47, 76, 77, 78, 79, 39],
 [40, 41, 42, 43, 72, 73, 74, 75, 29],
 [36, 37, 38, 39, 68, 69, 70, 71, 19]];

class sysex {
    static message(msg) {
        return [240, 0, 32, 41, 2, 13, ...msg, 247];
    }
}

class colorspec {
    #msg = [3];

    static(index, velocity) {
        this.#msg.push(0, index, velocity % 128);
        return this;
    }

    flashing(index, velocityA, velocityB) {
        this.#msg.push(1, index, velocityB % 128, velocityA % 128);
        return this;
    }

    pulsing(index, velocity) {
        this.#msg.push(2, index, velocity % 128);
        return this;
    }

    RGB(index, R, G, B) {
        this.#msg.push(3, index, R % 128, G % 128, B % 128);
        return this;
    }

    message() {
        return sysex.message(this.#msg);
    }
}

class lighting {
    static static(index, velocity) {
        return [Channel.NOTE_ON, index, velocity]
    }

    static flashing(index, velocityA, velocityB) {
        return [Channel.NOTE_ON_FLASHING, index, velocityA, velocityB]
    }

    static pulsing(index, velocity) {
        return [Channel.NOTE_ON_PULSING, index, velocity]
    }
}

class NoteEvent {
    constructor(index, velocity) {
        this.index = index;
        this.velocity = velocity;
    }
}

class Launchpad {
    onMidiMessage = () => {};
    bpm = 120;

    constructor(input, output) {
        this.input = input;
        this.output = output;
        this.input.onmidimessage = e => this.onMidiMessage(Launchpad.parse(e));
    }

    static parse(msg) {
        const { data } = msg;
        const type = data[0];
        switch (type) {
            case 144: {
                return new NoteEvent(data[1], data[2]);
            }
        }
    }

    static mapToDefault(index) {
        const row = Math.floor(+index % 100 / 10) % 10 - 1;
        const column = +index % 100 % 10 - 1;
        return { index: UserMode[8 - row][column], cc: row > 7 || column > 7};
    }

    static mapToProgrammer(index, cc) {
        for (let row = 1 - cc; row < UserMode.length; row++) {
            const r = UserMode[row];
            for (let column = 0; column < r.length - 1 + cc; column++) {
                if (index == r[column]) {
                    return (9 - row) * 10 + column + 1;
                }
            }
        }
    }

    static mapDefaultToXY(index, cc) {
        for (let row = 1 - cc; row < UserMode.length; row++) {
            const r = UserMode[row];
            for (let column = 0; column < r.length - 1 + cc; column++) {
                if (index == r[column]) {
                    return {x: column, y: 8 - row};
                }
            }
        }
    }

    setBPM(bpm) {
        this.bpm = bpm;
    }

    updateClock(self) {
        self.send([0xF8]);
    }

    startClock() {
        setInterval(this.updateClock, 2500 / this.bpm, this);
    }

    stopClock() {
        clearInterval(this.updateClock);
    }

    send(data) {
        this.output.send(data);
    }
}