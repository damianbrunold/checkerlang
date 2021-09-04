/*  Copyright (c) 2021 Damian Brunold, Gesundheitsdirektion Kanton Zürich

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
using System.Collections.Generic;
using System.Text;

namespace CheckerLang
{
    public class NodeAssignDestructuring : Node
    {
        private List<string> identifiers = new List<string>();
        private Node expression;

        private SourcePos pos;
        
        public NodeAssignDestructuring(List<string> identifiers, Node expression, SourcePos pos)
        {
            foreach (var identifier in identifiers)
            {
                if (identifier.StartsWith("checkerlang_")) throw new SyntaxError("Cannot assign to system variable " + identifier, pos);
            }
            this.identifiers.AddRange(identifiers);
            this.expression = expression;
            this.pos = pos;
        }

        public Value Evaluate(Environment environment)
        {
            var value = expression.Evaluate(environment);
            if (value.IsList() || value.IsSet())
            {
                var list = value.AsList().GetValue();
                Value result = ValueNull.NULL;
                for (var i = 0; i < identifiers.Count; i++)
                {
                    if (!environment.IsDefined(identifiers[i])) throw new ControlErrorException(new ValueString("ERROR"),"Variable '" + identifiers[i] + "' is not defined", pos);
                    if (i < list.Count)
                    {
                        environment.Set(identifiers[i], list[i]);
                        result = list[i];
                    }
                    else
                    {
                        environment.Set(identifiers[i], ValueNull.NULL);
                        result = ValueNull.NULL;
                    }
                }
                return result;

            }
            throw new ControlErrorException(new ValueString("ERROR"),"Destructuring assign expected list or set but got " + value.Type(), pos);
        }

        public override string ToString()
        {
            var result = new StringBuilder();
            result.Append("([");
            foreach (var identifier in identifiers)
            {
                result.Append(identifier).Append(", ");
            }
            if (identifiers.Count > 0) result.Remove(result.Length - 2, 2);
            result.Append("] = ").Append(expression).Append(")");
            return result.ToString();
        }
        
        public void CollectVars(ICollection<string> freeVars, ICollection<string> boundVars, ICollection<string> additionalBoundVars)
        {
            expression.CollectVars(freeVars, boundVars, additionalBoundVars);
        }
        
        public List<string> GetIdentifiers()
        {
            return identifiers;
        }

        public SourcePos GetSourcePos()
        {
            return pos;
        }

        public bool IsLiteral()
        {
            return false;
        }
    }
}