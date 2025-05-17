class Workout {
  description!: string;
  type!: string;
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(
    public coords: [number, number],
    public distance: number,
    public duration: number
  ) {}

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  cadence: number;
  pace!: number;
  type = 'running';

  constructor(
    coords: [number, number],
    distance: number,
    duration: number,
    cadence: number
  ) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  elevationGain: number;
  speed!: number;

  constructor(
    coords: [number, number],
    distance: number,
    duration: number,
    elevationGain: number
  ) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

type WorkoutType = Running | Cycling;

const form = document.querySelector('.form')! as HTMLFormElement;
const containerWorkouts = document.querySelector(
  '.workouts'
)! as HTMLUListElement;
const inputType = document.querySelector(
  '.form__input--type'
)! as HTMLInputElement;
const inputDistance = document.querySelector(
  '.form__input--distance'
)! as HTMLInputElement;
const inputDuration = document.querySelector(
  '.form__input--duration'
)! as HTMLInputElement;
const inputCadence = document.querySelector(
  '.form__input--cadence'
)! as HTMLInputElement;
const inputElevation = document.querySelector(
  '.form__input--elevation'
)! as HTMLInputElement;

class App {
  mapZoomLevel = 16;
  workouts: WorkoutType[] = [];
  map!: L.Map;
  mapEvent!: L.LeafletMouseEvent;

  constructor() {
    this._getPosition();
    this._getLocaleStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert('Could not get your position!')
      );
  }

  _loadMap(position: GeolocationPosition) {
    const { latitude, longitude } = position.coords;
    const coords: [number, number] = [latitude, longitude];

    this.map = L.map('map').setView(coords, this.mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', this._showForm.bind(this));

    this.workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE: L.LeafletMouseEvent) {
    this.mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row')!.classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row')!.classList.toggle('form__row--hidden');
  }

  _newWorkout(e: Event) {
    const validInputs = (...inputs: number[]) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs: number[]) => inputs.every(inp => inp > 0);
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.mapEvent.latlng;
    let workout!: WorkoutType;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout: WorkoutType) {
    L.marker(workout.coords)
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout: WorkoutType) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running' && 'pace' in workout)
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling' && 'speed' in workout)
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e: MouseEvent) {
    const workoutEl = (e.target as HTMLElement).closest(
      '.workout'
    ) as HTMLElement;
    if (!workoutEl) return;

    const workout = this.workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    if (!workout) return;

    this.map.setView(workout.coords, this.mapZoomLevel, {
      animate: true,
      duration: 1,
    });

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _getLocaleStorage() {
    const data = JSON.parse(localStorage.getItem('workouts') || '[]');

    this.workouts = data.map((obj: any) => {
      if (obj.type === 'running') {
        const run = new Running(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.cadence
        );
        run.date = new Date(obj.date);
        run.id = obj.id;
        run.clicks = obj.clicks;
        return run;
      }
      if (obj.type === 'cycling') {
        const cycle = new Cycling(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.elevationGain
        );
        cycle.date = new Date(obj.date);
        cycle.id = obj.id;
        cycle.clicks = obj.clicks;
        return cycle;
      }
      return obj;
    });

    this.workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
