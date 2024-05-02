require("dotenv").config()
const pg = require("pg")
const client = new pg.Client(process.env.DATABASE_URL || `postgres://localhost/${process.env.DB_Name}`)

const express = require("express");
const morgan = require("morgan");
const app = express()
app.use(express.json())
app.use(require('morgan')('dev'))


// GET /api/employees - returns array of employees
app.get('/api/employees', async (req, res, next) => {
    try {
        const SQL = /*SQL*/ ` SELECT * FROM employees `
        const response = await client.query(SQL)
        res.send(response.rows)
    } catch(error) {
        next(error)
    }
})

// GET /api/departments - returns an array of departments
app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = /*SQL*/ ` SELECT * FROM departments `
        const response = await client.query(SQL)
        res.send(response.rows)
    } catch(error) {
        next(error)
    }
})

// POST /api/employees - payload: the employee to create, returns the created employee
app.post('/api/employees', async (req, res, next) => {
    try {
        const SQL = /* SQL */ `
            INSERT INTO employees(name, department_id)
            VALUES($1, $2)
            RETURNING *
        `
        const response = await client.query(SQL, [
            req.body.name,
            req.body.department_id
        ])
        res.send(response.rows[0])
    } catch(error) {
        next(error)
    }
})

// DELETE /api/employees/:id - the id of the employee to delete is passed in the URL, returns nothing
app.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = /* SQL */ `
            DELETE FROM employees
            WHERE id=$1
        `
        await client.query(SQL, [req.params.id])
        res.sendStatus(204)
    }catch(error){
        next(error)
    }
})

// PUT /api/employees/:id - payload: the updated employee returns the updated employee
app.put('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = /* SQL */ `
            UPDATE employees
            SET name=$1, department_id=$2, updated_at=now()
            WHERE id=$3
            RETURNING *
        `;
        const response = await client.query(SQL, 
            [req.body.name,
            req.body.department_id,
            req.params.id]
        )
        res.send(response.rows[0])
    } catch(error){
        next(error)
    }
})

// add an error handling route which returns an object with an error property.
app.use((error, req, res, next) => {
    res.status(res.status || 500).send({ error: error });
  });


const init = async () => {
    await client.connect()
    
    let SQL = /* SQL */ `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;
        CREATE TABLE departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
        );
        CREATE TABLE employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );
    `;
    await client.query(SQL)
    console.log('tables created');

    SQL = /* SQL */ `
        INSERT INTO departments(name) VALUES('Skateboards');
        INSERT INTO departments(name) VALUES('Snowboards');
        INSERT INTO departments(name) VALUES('Surfboards');

        INSERT INTO employees(name, department_id) VALUES('Max',(SELECT id FROM departments WHERE name='Skateboards'));
        INSERT INTO employees(name, department_id) VALUES('Chelsea', (SELECT id FROM departments WHERE name='Surfboards'));
        INSERT INTO employees(name, department_id) VALUES('Kaleb', (SELECT id FROM departments WHERE name='Snowboards'));
    `;

    await client.query(SQL)
    console.log('data seeded');

    const port = process.env.PORT
    app.listen(port, console.log(`listening on port ${port}`))
}
init()